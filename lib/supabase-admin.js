import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL is missing.');
}

if (!serviceRoleKey) {
  console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing.');
}

/**
 * Administrative Supabase Client with full service-role privileges.
 * Run strictly server-side inside Route Handlers / Server Actions.
 */
export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabaseAdmin;
