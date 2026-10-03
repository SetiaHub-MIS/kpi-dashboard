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
