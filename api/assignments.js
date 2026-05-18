// GET  /api/assignments?registration_id=... — get assigned souls for a caregiver
// POST /api/assignments { registration_id, member_person_id } — create assignment
// DELETE /api/assignments?id=... — remove assignment
export default async function handler(req, res) {
  let SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ success: false, error: 'Database not configured' });
  }

  SUPABASE_URL = SUPABASE_URL.replace(/\/+$/, '');
  if (SUPABASE_URL.endsWith('/rest/v1')) SUPABASE_URL = SUPABASE_URL.slice(0, -8);

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // ─── GET: fetch assignments for a registration ───
    if (req.method === 'GET') {
      const { registration_id, phone } = req.query;

      let url;
      if (registration_id) {
        // Fetch by registration_id, embed people to get soul names
        url = `${SUPABASE_URL}/rest/v1/others_assignments?registration_id=eq.${registration_id}&select=id,registration_id,member_person_id,created_at,people:member_person_id(id,full_name,phone_number)`;
      } else if (phone) {
        // For attendance page: first find registration by phone, then get assignments
        const regRes = await fetch(
          `${SUPABASE_URL}/rest/v1/registrations?phone_number=eq.${encodeURIComponent(phone)}&select=id,full_name&limit=1`,
          { headers }
        );
        if (!regRes.ok) throw new Error(`Supabase: ${await regRes.text()}`);
        const regs = await regRes.json();
        if (!regs.length) {
          return res.status(404).json({ success: false, error: 'Caregiver not found' });
        }

        const reg = regs[0];
        url = `${SUPABASE_URL}/rest/v1/others_assignments?registration_id=eq.${reg.id}&select=id,registration_id,member_person_id,created_at,people:member_person_id(id,full_name,phone_number)`;

        const assignRes = await fetch(url, { headers });
        if (!assignRes.ok) throw new Error(`Supabase: ${await assignRes.text()}`);
        const assignments = await assignRes.json();

        const souls = assignments.map(a => ({
          id: a.id,
          person_id: a.member_person_id,
          full_name: a.people?.full_name || 'Unknown',
          phone_number: a.people?.phone_number || '',
        }));

        return res.status(200).json({
          success: true,
          caregiver: { id: reg.id, full_name: reg.full_name },
          souls,
        });
      } else {
        return res.status(400).json({ success: false, error: 'registration_id or phone is required' });
      }

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Supabase: ${await response.text()}`);
      const assignments = await response.json();

      const souls = assignments.map(a => ({
        id: a.id,
        person_id: a.member_person_id,
        full_name: a.people?.full_name || 'Unknown',
        phone_number: a.people?.phone_number || '',
      }));

      return res.status(200).json({ success: true, assignments: souls });
    }

    // ─── POST: create a new assignment ───
    if (req.method === 'POST') {
      const { registration_id, member_person_id } = req.body;

      if (!registration_id || !member_person_id) {
        return res.status(400).json({ success: false, error: 'registration_id and member_person_id are required' });
      }

      // Check for duplicate
      const dupCheck = await fetch(
        `${SUPABASE_URL}/rest/v1/others_assignments?registration_id=eq.${registration_id}&member_person_id=eq.${member_person_id}&select=id`,
        { headers }
      );
      const dups = await dupCheck.json();
      if (dups && dups.length > 0) {
        return res.status(409).json({ success: false, error: 'This soul is already assigned to this caregiver' });
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/others_assignments`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ registration_id, member_person_id }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase: ${response.status} - ${errText}`);
      }

      const created = await response.json();
      return res.status(201).json({ success: true, assignment: created[0] });
    }

    // ─── DELETE: remove an assignment ───
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'Assignment id is required' });

      const response = await fetch(`${SUPABASE_URL}/rest/v1/others_assignments?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase: ${response.status} - ${errText}`);
      }

      return res.status(200).json({ success: true, message: 'Assignment removed' });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
