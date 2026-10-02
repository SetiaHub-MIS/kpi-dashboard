/**
 * How long a signed-in session may last on one device. Supabase keeps a
 * session alive for as long as its refresh token is used, so the limits are
 * held here instead: the app records when the person signed in and when they
 * last touched it, and signs the device out once either limit is passed
 * (src/lib/sessionGuard.ts). The reports app (kpi-dashboard-reports
 * src/data/session.ts) applies the same two numbers.
 *
 *   node --test tests/sessionLimits.test.mjs
 */

/** Signed out after this long with no tap, scroll or key press. */
export const IDLE_LIMIT_MS = 15 * 60 * 1000;

/** Signed out this long after signing in, however busy the person is. */
export const MAX_SESSION_MS = 3 * 60 * 60 * 1000;

/** A clock that has gone back further than this is not trusted to time a session. */
const CLOCK_SLACK_MS = 5 * 60 * 1000;

export type SessionStamps = { signedInAt: number; lastActiveAt: number };

/** Why a session is over: idle too long, three hours up, or no record of it. */
export type SessionEnd = 'idle' | 'max' | 'expired';

/**
 * Why the session must end now, or null while it may go on. A session with no
 * record of when it began — one signed in before these limits existed, or
 * whose record was lost — ends too: it cannot be shown to be within them.
 */
export function sessionEnd(stamps: SessionStamps | null, now: number): SessionEnd | null {
  if (!stamps) return 'expired';
  if (now < stamps.signedInAt - CLOCK_SLACK_MS) return 'expired';
  if (now - stamps.signedInAt >= MAX_SESSION_MS) return 'max';
  if (now - stamps.lastActiveAt >= IDLE_LIMIT_MS) return 'idle';
  return null;
}

/** Two records of the same session (memory and storage) read as the later activity. */
export function mergeStamps(a: SessionStamps | null, b: SessionStamps | null): SessionStamps | null {
  if (!a) return b;
  if (!b) return a;
  return {
    signedInAt: Math.max(a.signedInAt, b.signedInAt),
    lastActiveAt: Math.max(a.lastActiveAt, b.lastActiveAt),
  };
}
