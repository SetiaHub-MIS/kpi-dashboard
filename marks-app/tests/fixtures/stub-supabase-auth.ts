/**
 * Stand-in for src/lib/supabase.ts in sign-in tests: every password is right,
 * the login is always the same one, and `fake.row` is the directory row it is
 * linked to. `fake.signedOut` counts the sign-outs.
 */
export const isSupabaseConfigured = true;

export const fake: { row: Record<string, unknown> | null; signedOut: number } = { row: null, signedOut: 0 };

export const supabase = {
  functions: {
    invoke: async () => ({ data: { access_token: 'access', refresh_token: 'refresh' }, error: null }),
  },
  auth: {
    setSession: async () => ({ error: null }),
    getUser: async () => ({ data: { user: { id: 'auth-1' } } }),
    signOut: async () => {
      fake.signedOut += 1;
      return { error: null };
    },
  },
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: fake.row, error: null }) }) }),
  }),
};
