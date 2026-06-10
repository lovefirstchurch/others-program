// GET /api/members-search?q=... — search members (souls) from members JOIN people
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let SUPABASE_URL = process.env.SUPABASE_URL;
    const API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !API_KEY) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    SUPABASE_URL = SUPABASE_URL.replace(/\/+$/, '');
    if (SUPABASE_URL.endsWith('/rest/v1')) SUPABASE_URL = SUPABASE_URL.slice(0, -8);

    const { q } = req.query;

    let membersUrl = `${SUPABASE_URL}/rest/v1/members?select=person_id,member_code,status,people!inner(id,full_name,phone_number,location)&limit=50`;
    let visitorsUrl = `${SUPABASE_URL}/rest/v1/visitors?select=person_id,people!inner(id,full_name,phone_number,location)&limit=50`;
    let fhycUrl = `${SUPABASE_URL}/rest/v1/fhyc_forms?select=id,name,contact,location,gave_life_to_christ,wants_to_join_church&limit=50`;

    if (q && q.trim()) {
      const filter = `&people.full_name=ilike.*${encodeURIComponent(q.trim())}*`;
      membersUrl += filter;
      visitorsUrl += filter;
      fhycUrl += `&name=ilike.*${encodeURIComponent(q.trim())}*`;
    }

    const headers = {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
    };

    const [membersRes, visitorsRes, fhycRes] = await Promise.all([
      fetch(membersUrl, { headers }),
      fetch(visitorsUrl, { headers }),
      fetch(fhycUrl, { headers })
    ]);

    if (!membersRes.ok) {
      const errText = await membersRes.text();
      throw new Error(`Supabase Members Error: ${membersRes.status} - ${errText}`);
    }
    if (!visitorsRes.ok) {
      const errText = await visitorsRes.text();
      throw new Error(`Supabase Visitors Error: ${visitorsRes.status} - ${errText}`);
    }
    if (!fhycRes.ok) {
      const errText = await fhycRes.text();
      throw new Error(`Supabase FHYC Error: ${fhycRes.status} - ${errText}`);
    }

    let membersData = await membersRes.json();
    let visitorsData = await visitorsRes.json();
    let fhycData = await fhycRes.json();

    // Flatten results: filter out null people
    if (q && q.trim()) {
      membersData = membersData.filter(m => m.people !== null);
      visitorsData = visitorsData.filter(v => v.people !== null);
    }

    // Reshape members
    const mappedMembers = membersData.map(m => ({
      person_id: m.person_id,
      member_code: m.member_code || '',
      status: m.status || '',
      full_name: m.people?.full_name || 'Unknown',
      phone_number: m.people?.phone_number || '',
      location: m.people?.location || '',
      type: 'Member',
    }));

    // Reshape visitors (first timers / new converts)
    const mappedVisitors = visitorsData.map(v => ({
      person_id: v.person_id,
      member_code: '',
      status: '',
      full_name: v.people?.full_name || 'Unknown',
      phone_number: v.people?.phone_number || '',
      location: v.people?.location || '',
      type: 'First Timer / Convert',
    }));

    // Reshape fhyc_forms
    const mappedFhyc = fhycData.map(f => {
      let type = 'FHYC Visitor';
      if (f.gave_life_to_christ) {
        type = 'New Convert (FHYC)';
      } else if (f.wants_to_join_church) {
        type = 'First Timer (FHYC)';
      }
      return {
        person_id: f.id,
        member_code: '',
        status: '',
        full_name: f.name || 'Unknown',
        phone_number: f.contact || '',
        location: f.location || '',
        type,
      };
    });

    // Combine and sort alphabetically
    const combined = [...mappedMembers, ...mappedVisitors, ...mappedFhyc];
    combined.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return res.status(200).json({ success: true, members: combined });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
