import { getPool } from './_db.js';

// GET /api/registrations — list all caregivers from the registrations table
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const db = getPool();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    const { rows } = await db.query(
      `SELECT id, full_name, phone_number, pastor_name, location, created_at
         FROM registrations
        ORDER BY created_at DESC`
    );
    return res.status(200).json({ success: true, registrations: rows });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
