import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True once the project credentials are present. The app still runs on its
 * in-memory stores without them, so this is a switch rather than a crash —
 * screens migrate onto Supabase one at a time.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured. Copy .env.example to .env.local and fill in ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Metro.'
  );
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: {
    // Sessions survive a restart, and refresh without the user noticing.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Mobile has no URL bar to read a callback out of.
    detectSessionInUrl: false,
  },
});

/**
 * The staff row behind the signed-in account. Auth issues a UUID; the directory
 * is keyed by payroll number, and `users.auth_user_id` bridges the two.
 *
 * RLS lets any signed-in user read their own row, so this needs no elevated
 * access — and it returns null rather than throwing when no login is linked yet.
 */
export async function fetchCurrentStaff() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, name, short_name, initials, role, branch_id, active')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
