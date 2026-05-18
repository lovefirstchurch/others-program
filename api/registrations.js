// GET /api/registrations — list all caregivers from the registrations table
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

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?select=id,full_name,phone_number,pastor_name,location,created_at&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return res.status(200).json({ success: true, registrations: data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
