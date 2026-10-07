import { getPool } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const data = req.body;
    const db = getPool();

    if (db) {
      await db.query(
        `INSERT INTO registrations (full_name, phone_number, pastor_name, location)
         VALUES ($1, $2, $3, $4)`,
        [data.fullName, data.phoneNumber, data.pastorName, data.location]
      );
    } else {
      // Just log it if the database isn't set up yet
      console.log('DATABASE_URL not set. Received data:', data);
    }

    return res.status(200).json({ success: true, message: "Registration received successfully!" });
  } catch (err) {
    console.error('Error handling submission:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
}
