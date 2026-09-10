import { currentPeriod } from '@/data/period';
import { fetchAssets } from '@/lib/assets';
import { fetchDirectory } from '@/lib/directory';
import { fetchMyReminders } from '@/lib/reminders';
import { fetchReturns } from '@/lib/returns';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAssets } from '@/store/useAssets';
import { useBranches } from '@/store/useBranches';
import { useMarks } from '@/store/useMarks';
import { useMyWeeks } from '@/store/useMyWeeks';
import { useReminders } from '@/store/useReminders';
import { useReturns } from '@/store/useReturns';
import { useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';

/**
 * Loads the directory into the stores under whatever session is current.
 *
 * Called from two places, and it has to be both: after signing in, and after a
 * stored session is restored on boot. Doing it only on sign-in meant reopening
 * the app fell back to seed data without saying so — the marks a supervisor had
 * just written would simply not be there.
 *
 * Returns false when there is nothing to load or the load failed, in which case
 * the stores keep whatever they had.
 */
export async function hydrateDirectory(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const dir = await fetchDirectory(currentPeriod(), useMarks.getState().scaleMax);
    useBranches.getState().hydrate(dir.branches);
    useUsers.getState().hydrate(dir.users);
    // Verification needs the marks.id behind each person-week, and which of
    // them the Area Manager has already signed off.
    useMarks.getState().noteMarkIds(dir.markIds);
    useMarks.getState().noteVerified(dir.verified);
    useMarks.getState().noteWeekNotes(dir.notes);
    useMarks.getState().noteAdjusted(dir.adjusted);
    useMarks.getState().noteMarkMax(dir.markMax);

    // Returns are read separately: a role with no access to them still needs
    // the directory, and a refusal here must not empty the staff list.
    try {
      const { records, ids } = await fetchReturns();
      useReturns.getState().hydrate(records, ids);
    } catch {
      // Roles shut out of returns land here by design.
    }

    try {
      useAssets.getState().hydrate(await fetchAssets());
    } catch {
      // Roles with no branch to see assets for land here.
    }

    try {
      useReminders.getState().hydrate(await fetchMyReminders());
    } catch {
      // Nobody has ever sent this account one, or the read was refused.
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Signs out and empties everything the session loaded.
 *
 * Clearing the stores is the point, not tidiness. These phones are shared — a
 * stockroom handset passes between shifts — and leaving the previous person's
 * directory, marks and returns in memory would show them to whoever signs in
 * next, for as long as it took the new session to load its own. Under RLS that
 * data was never theirs to see.
 *
 * The queue is deliberately left alone: a mark typed with no signal belongs to
 * the person who typed it and must survive them signing out, or the work is
 * lost exactly when the app promised it would not be.
 */
export async function signOutAndClear(): Promise<void> {
  await useSession.getState().signOut();

  if (!isSupabaseConfigured) return;

  useUsers.getState().hydrate([]);
  useBranches.getState().hydrate([]);
  useReturns.getState().hydrate([], {});
  useAssets.getState().hydrate([]);
  useReminders.getState().hydrate([]);
  useMarks.getState().reset();
  useMyWeeks.getState().reset();
}
