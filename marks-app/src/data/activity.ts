/**
 * What the app is doing with the server right now, for the indicator at the
 * top of the screen (components/ActivityBar.tsx). Every request the Supabase
 * client makes passes through lib/activity.ts and is counted by kind, so
 * nothing loads or saves without the screen saying so.
 */

export type RequestKind = 'load' | 'save';

/**
 * Reading says "Memuatkan…", writing says "Menyimpan…". Reads are any GET,
 * plus the POSTs that fetch rather than change: sign-in and session calls,
 * the Edge Functions (payroll sign-in, the XLSX export) and a photo's signed
 * link. Everything else changes data — table writes, the set_* RPCs, photo
 * uploads and deletes.
 */
export function requestKind(method: string | undefined, url: string): RequestKind {
  const m = (method ?? 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return 'load';
  if (
    url.includes('/auth/v1/') ||
    url.includes('/functions/v1/') ||
    url.includes('/storage/v1/object/sign/')
  ) {
    return 'load';
  }
  return 'save';
}

/** Saving outranks loading: a save in flight is the one the person is waiting on. */
export function activityKind(loads: number, saves: number): RequestKind | null {
  if (saves > 0) return 'save';
  if (loads > 0) return 'load';
  return null;
}

/**
 * Why something failed, short enough for a banner and specific enough to act
 * on: the database's own code and words (PostgREST errors carry both), or a
 * network or script error's message. Long ones are cut.
 */
export function errorDetail(err: unknown, max = 180): string {
  let text = '';
  if (err && typeof err === 'object') {
    const e = err as { code?: unknown; message?: unknown };
    const code = typeof e.code === 'string' && e.code ? `${e.code} ` : '';
    const message = typeof e.message === 'string' ? e.message : '';
    text = `${code}${message}`.trim();
  }
  if (!text) text = String(err ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** A request quicker than this never shows the indicator: no flicker on every tap. */
export const SHOW_AFTER_MS = 300;

/** Once shown, the indicator stays at least this long, so it is read rather than flashed. */
export const MIN_VISIBLE_MS = 600;
