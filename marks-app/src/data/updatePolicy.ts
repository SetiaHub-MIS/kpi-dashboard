import { pad } from '@/data/period';

/**
 * When a downloaded app update (EAS Update, lib/appUpdates.ts) is put to use.
 *
 * Restarting the app is what applies it, and a restart drops whatever is on
 * screen — a half-filled checklist, a note being typed. Marks waiting to send
 * are kept on the phone and survive it. So the app restarts on its own only
 * when nobody is signed in; a signed-in person is offered the restart and
 * chooses the moment. Either way a closed and reopened app runs the update.
 */

export type UpdateStep =
  /** Nothing downloaded yet. */
  | 'wait'
  /** Downloaded and nobody is signed in: restart now. */
  | 'restart'
  /** Downloaded and someone is signed in: offer the restart. */
  | 'offer';

export function updateStep(s: { downloaded: boolean; signedIn: boolean }): UpdateStep {
  if (!s.downloaded) return 'wait';
  return s.signedIn ? 'offer' : 'restart';
}

/**
 * The app checks on every launch by itself. Coming back to the front checks
 * again, but not more often than this: Expo asks apps not to poll.
 */
export const RECHECK_AFTER_MS = 10 * 60 * 1000;

export function shouldRecheck(lastCheckAt: number, now: number): boolean {
  // A clock set back is no reason to stop checking.
  return now < lastCheckAt || now - lastCheckAt >= RECHECK_AFTER_MS;
}

/**
 * Which code the app is running, as the account screen shows it, so a phone
 * can be checked without guessing: the web build (with the Vercel deploy's
 * time and commit, against the Vercel dashboard), a development run, the
 * APK's own built-in code, or a downloaded update (against `eas update:list`).
 */
export type RunningCode =
  | { kind: 'web'; commit: string | null; builtAt: Date | null }
  | { kind: 'dev' }
  | { kind: 'builtin' }
  | { kind: 'update'; id: string; publishedAt: Date | null };

export function runningCode(s: {
  web: boolean;
  /** expo-updates is on: an EAS-built APK, not Expo Go or a dev run. */
  enabled: boolean;
  /** Running the code the APK shipped with, not a downloaded update. */
  embedded: boolean;
  updateId: string | null;
  createdAt: Date | null;
  /** Stamped into the web build by vercel.json; absent in a local build. */
  webCommit?: string | null;
  webBuiltAt?: string | null;
}): RunningCode {
  if (s.web) {
    const builtAt = s.webBuiltAt ? new Date(s.webBuiltAt) : null;
    return {
      kind: 'web',
      commit: s.webCommit ? s.webCommit.slice(0, 7) : null,
      builtAt: builtAt && !Number.isNaN(builtAt.getTime()) ? builtAt : null,
    };
  }
  if (!s.enabled) return { kind: 'dev' };
  if (s.embedded || !s.updateId) return { kind: 'builtin' };
  return { kind: 'update', id: s.updateId.slice(0, 8), publishedAt: s.createdAt };
}

/** "8/10/2026 09:48" in the phone's own time — when the update was published or the site deployed. */
export function publishedLabel(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
