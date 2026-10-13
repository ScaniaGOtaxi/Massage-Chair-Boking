import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'Cache-Control': 'no-cache' },
  }
});

// Cache auth state with TTL
let cachedSession: any = null;
let lastCheck = 0;
const TTL = 5 * 60 * 1000; // 5 minutes

export const getSession = async () => {
  try {
    const now = Date.now();
    
    // If we have a cached session and it's still fresh, verify it's still valid
    if (cachedSession && now - lastCheck < TTL) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        return { data: { session: cachedSession }, error: null };
      }
    }

    // Clear any existing session data
    clearAuthCache();

    // Get a fresh session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      if (error.message.includes('JWT')) {
        await supabase.auth.signOut();
        return { data: { session: null }, error: { message: 'session_not_found' } };
      }
      return { data: { session: null }, error };
    }

    if (session) {
      // Verify the user still exists
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        await supabase.auth.signOut();
        return { data: { session: null }, error: { message: 'session_not_found' } };
      }

      cachedSession = session;
      lastCheck = now;
      return { data: { session }, error: null };
    }

    return { data: { session: null }, error: null };
  } catch (error) {
    clearAuthCache();
    await supabase.auth.signOut();
    return { data: { session: null }, error };
  }
};

export const clearAuthCache = () => {
  cachedSession = null;
  lastCheck = 0;
};

// Set up auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    clearAuthCache();
  } else if (session) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        await supabase.auth.signOut();
        clearAuthCache();
        return;
      }
      
      cachedSession = session;
      lastCheck = Date.now();
    } catch (error) {
      console.error('Error checking user status:', error);
      await supabase.auth.signOut();
      clearAuthCache();
    }
  }
});