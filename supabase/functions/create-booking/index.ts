import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { userId, name, email, date, startTime, endTime, sessions } = await req.json();

    // Validate required parameters
    if (!userId || !name || !email || !date || !startTime || !endTime || !sessions) {
      throw new Error('Missing required parameters');
    }

    // Validate user matches authenticated user
    if (userId !== user.id) {
      throw new Error('User ID mismatch');
    }

    // Lock the time slot to prevent concurrent bookings
    const { data: existingBookings, error: checkError } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .or(`start_time.lte.${endTime},end_time.gte.${startTime}`)
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error('Failed to check time slot availability');
    }

    if (existingBookings) {
      throw new Error('This time slot has already been booked');
    }

    // Insert the booking
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        name,
        email,
        date,
        start_time: startTime,
        end_time: endTime,
        sessions
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create booking');
    }

    return new Response(
      JSON.stringify({ data, success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Booking error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});