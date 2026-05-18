export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const data = Object.fromEntries(formData);

    // Check if Supabase env variables are set
    if (context.env.SUPABASE_URL && context.env.SUPABASE_ANON_KEY) {
      // Send data to Supabase
      const response = await fetch(`${context.env.SUPABASE_URL}/rest/v1/registrations`, {
        method: 'POST',
        headers: {
          'apikey': context.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_ANON_KEY}`,
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
        throw new Error("Failed to save to database.");
      }
    } else {
      // Just log it if Supabase isn't set up yet
      console.log('Supabase env vars not set. Received data:', data);
    }
    return new Response(JSON.stringify({ success: true, message: "Registration received successfully!" }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}


