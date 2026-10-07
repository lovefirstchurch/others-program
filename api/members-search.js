import { getPool } from './_db.js';

// GET /api/members-search?q=... — search members, visitors and FHYC forms
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const db = getPool();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const q = (req.query.q || '').trim();
    // NULL pattern means "no filter"
    const pattern = q ? `%${q}%` : null;

    const [membersRes, visitorsRes, fhycRes] = await Promise.all([
      db.query(
        `SELECT m.person_id, m.member_code, m.status, p.full_name, p.phone_number, p.location
           FROM members m
           JOIN people p ON p.id = m.person_id
          WHERE $1::text IS NULL OR p.full_name ILIKE $1
          LIMIT 50`,
        [pattern]
      ),
      db.query(
        `SELECT v.person_id, p.full_name, p.phone_number, p.location
           FROM visitors v
           JOIN people p ON p.id = v.person_id
          WHERE $1::text IS NULL OR p.full_name ILIKE $1
          LIMIT 50`,
        [pattern]
      ),
      db.query(
        `SELECT id, name, contact, location, gave_life_to_christ, wants_to_join_church
           FROM fhyc_forms
          WHERE $1::text IS NULL OR name ILIKE $1
          LIMIT 50`,
        [pattern]
      ),
    ]);

    // Reshape members
    const mappedMembers = membersRes.rows.map(m => ({
      person_id: m.person_id,
      member_code: m.member_code || '',
      status: m.status || '',
      full_name: m.full_name || 'Unknown',
      phone_number: m.phone_number || '',
      location: m.location || '',
      type: 'Member',
    }));

    // Reshape visitors (first timers / new converts)
    const mappedVisitors = visitorsRes.rows.map(v => ({
      person_id: v.person_id,
      member_code: '',
      status: '',
      full_name: v.full_name || 'Unknown',
      phone_number: v.phone_number || '',
      location: v.location || '',
      type: 'First Timer / Convert',
    }));

    // Reshape fhyc_forms
    const mappedFhyc = fhycRes.rows.map(f => {
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
