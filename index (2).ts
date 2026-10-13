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

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the requesting user is authenticated
    const userResponse = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userResponse.error) {
      throw new Error('Invalid authentication');
    }

    // Check if the user is an admin or super admin
    const { data: adminData } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', userResponse.data.user.id)
      .maybeSingle();

    const { data: superAdminData } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', userResponse.data.user.id)
      .maybeSingle();

    if (!adminData && !superAdminData) {
      throw new Error('User is not an admin or super admin');
    }

    // Get the user ID to delete from the request body
    const { userId } = await req.json();
    if (!userId) {
      throw new Error('No user ID provided');
    }

    // Check if the target user is a super admin
    const { data: targetSuperAdminData } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Only super admins can delete super admins
    if (targetSuperAdminData && !superAdminData) {
      throw new Error('Only super admins can delete super admin users');
    }

    // Delete user's bookings
    await supabase
      .from('bookings')
      .delete()
      .eq('user_id', userId);

    // Delete from super_admins table if they're a super admin
    await supabase
      .from('super_admins')
      .delete()
      .eq('user_id', userId);

    // Delete from admins table if they're an admin
    await supabase
      .from('admins')
      .delete()
      .eq('user_id', userId);

    // Delete user's avatar if exists
    const { data: avatarData } = await supabase
      .storage
      .from('avatars')
      .list(userId);

    if (avatarData && avatarData.length > 0) {
      await supabase
        .storage
        .from('avatars')
        .remove([`${userId}/${avatarData[0].name}`]);
    }

    // Delete from users table
    await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    // Delete auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
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