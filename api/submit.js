export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const data = req.body;
    
    // Check if Supabase env variables are set
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      // Send data to Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal' // Don't return the inserted row to save bandwidth
        },
        body: JSON.stringify({
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          pastor_name: data.pastorName,
          location: data.location
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Supabase submission failed:", errorText);
        throw new Error(`Supabase Error: ${response.status} - ${errorText}`);
      }
    } else {
      // Just log it if Supabase isn't set up yet
      console.log('Supabase env vars not set. Received data:', data);
    }
    
    return res.status(200).json({ success: true, message: "Registration received successfully!" });
  } catch (err) {
    console.error('Error handling submission:', err);
    return res.status(400).json({ success: false, error: err.message, stack: err.stack });
  }
}
