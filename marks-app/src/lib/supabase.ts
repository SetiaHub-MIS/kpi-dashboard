import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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
    // A password-reset link lands on the web app with its token in the URL
    // fragment; on the phone there is no URL bar to read a callback out of.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
