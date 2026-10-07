import { getPool } from './_db.js';

const SOULS_FOR_REGISTRATION = `
  SELECT a.id, a.member_person_id AS person_id,
         COALESCE(p.full_name, 'Unknown') AS full_name,
         COALESCE(p.phone_number, '') AS phone_number
    FROM others_assignments a
    LEFT JOIN people p ON p.id = a.member_person_id
   WHERE a.registration_id = $1`;

// GET  /api/assignments?registration_id=... — get assigned souls for a caregiver
// POST /api/assignments { registration_id, member_person_id } — create assignment
// DELETE /api/assignments?id=... — remove assignment
export default async function handler(req, res) {
  const db = getPool();
  if (!db) {
    return res.status(500).json({ success: false, error: 'Database not configured' });
  }

  try {
    // ─── GET: fetch assignments for a registration ───
    if (req.method === 'GET') {
      const { registration_id, phone } = req.query;

      if (registration_id) {
        const { rows } = await db.query(SOULS_FOR_REGISTRATION, [registration_id]);
        return res.status(200).json({ success: true, assignments: rows });
      }

      if (phone) {
        // For attendance page: first find registration by phone, then get assignments
        const regs = await db.query(
          'SELECT id, full_name FROM registrations WHERE phone_number = $1 LIMIT 1',
          [phone]
        );
        if (!regs.rows.length) {
          return res.status(404).json({ success: false, error: 'Caregiver not found' });
        }

        const reg = regs.rows[0];
        const { rows } = await db.query(SOULS_FOR_REGISTRATION, [reg.id]);
        return res.status(200).json({
          success: true,
          caregiver: { id: reg.id, full_name: reg.full_name },
          souls: rows,
        });
      }

      return res.status(400).json({ success: false, error: 'registration_id or phone is required' });
    }

    // ─── POST: create a new assignment ───
    if (req.method === 'POST') {
      const { registration_id, member_person_id } = req.body;

      if (!registration_id || !member_person_id) {
        return res.status(400).json({ success: false, error: 'registration_id and member_person_id are required' });
      }

      // Check if member_person_id exists in people. If not, try promoting from fhyc_forms.
      const person = await db.query('SELECT id FROM people WHERE id = $1', [member_person_id]);

      if (!person.rows.length) {
        const fhyc = await db.query(
          'SELECT name, contact, location FROM fhyc_forms WHERE id = $1',
          [member_person_id]
        );

        if (!fhyc.rows.length) {
          return res.status(404).json({ success: false, error: 'Target person not found in database' });
        }

        // Insert a record into people so the foreign key constraint is satisfied.
        const f = fhyc.rows[0];
        await db.query(
          `INSERT INTO people (id, full_name, phone_number, location)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [member_person_id, f.name, f.contact, f.location]
        );
      }

      // Check for duplicate
      const dups = await db.query(
        'SELECT id FROM others_assignments WHERE registration_id = $1 AND member_person_id = $2',
        [registration_id, member_person_id]
      );
      if (dups.rows.length) {
        return res.status(409).json({ success: false, error: 'This soul is already assigned to this caregiver' });
      }

      const { rows } = await db.query(
        `INSERT INTO others_assignments (registration_id, member_person_id)
         VALUES ($1, $2)
         RETURNING *`,
        [registration_id, member_person_id]
      );
      return res.status(201).json({ success: true, assignment: rows[0] });
    }

    // ─── DELETE: remove an assignment ───
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'Assignment id is required' });

      await db.query('DELETE FROM others_assignments WHERE id = $1', [id]);
      return res.status(200).json({ success: true, message: 'Assignment removed' });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
