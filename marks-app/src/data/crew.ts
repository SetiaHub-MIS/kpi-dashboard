/**
 * What is left of the sample crew data.
 *
 * The weekly marks, per-perkara detail and manager sign-offs that used to live
 * here are now read from Postgres — see `fetchMyWeeks` for the self-view and
 * `fetchDirectory` for everyone else. Only the demo sign-in needs a name to
 * start from, and only when the app is running without project credentials.
 */

/** Whose account the demo role picker signs in as. Unused once Supabase is configured. */
export const ME_ID = 'KP0093';
