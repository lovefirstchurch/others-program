// GET /api/members-search?q=... — search members (souls) from members JOIN people
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    SUPABASE_URL = SUPABASE_URL.replace(/\/+$/, '');
    if (SUPABASE_URL.endsWith('/rest/v1')) SUPABASE_URL = SUPABASE_URL.slice(0, -8);

    const { q } = req.query;

    // Fetch members joined with people using Supabase's embedded resource syntax
    // members.person_id references people.id
    let url = `${SUPABASE_URL}/rest/v1/members?select=person_id,member_code,status,people:person_id(id,full_name,phone_number,location)&limit=50`;

    if (q && q.trim()) {
      // Filter by people.full_name using ilike (case-insensitive)
      url += `&people.full_name=ilike.*${encodeURIComponent(q.trim())}*`;
    }

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Error: ${response.status} - ${errText}`);
    }

    let data = await response.json();

    // Flatten the result: filter out members where people join returned null (no match)
    if (q && q.trim()) {
      data = data.filter(m => m.people !== null);
    }

    // Reshape for easier frontend consumption
    const members = data.map(m => ({
      person_id: m.person_id,
      member_code: m.member_code,
      status: m.status,
      full_name: m.people?.full_name || 'Unknown',
      phone_number: m.people?.phone_number || '',
      location: m.people?.location || '',
    }));

    return res.status(200).json({ success: true, members });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
