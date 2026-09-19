import { PERIODS, currentWeekIdx } from '@/data/checklist';
import { todayShort, weekStarted } from '@/data/period';
import { fetchAssets } from '@/lib/assets';
import { fetchTugasan } from '@/lib/tugasan';
import { fetchDirectory, fetchRoleChanges, fetchStaff } from '@/lib/directory';
import { fetchMyReminders } from '@/lib/reminders';
import { fetchReturns } from '@/lib/returns';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAssets } from '@/store/useAssets';
import { useTugasan } from '@/store/useTugasan';
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
    const marks = useMarks.getState();
    const dir = await fetchDirectory(PERIODS[marks.monthIdx], marks.scaleMax);
    useBranches.getState().hydrate(dir.branches);
    useUsers.getState().hydrate(dir.users);
    notePeriod(dir);

    // Promotion history is admin's alone; anyone else is refused and keeps
    // an empty list, which is the right answer for them anyway.
    try {
      const names = new Map(dir.users.map((u) => [u.id, u.name]));
      useUsers.getState().hydrateHistory(
        (await fetchRoleChanges()).map((r) => ({
          id: r.userId,
          name: names.get(r.userId) ?? r.userId,
          from: r.from,
          to: r.to,
          at: todayShort(new Date(r.changedAt)),
        }))
      );
    } catch {
      // Not admin.
    }

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
      useTugasan.getState().hydrate(await fetchTugasan());
    } catch {
      // Same: nothing to see, or refused. The seed block stays for demo mode only.
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

/** What a month's marks add to the store beyond the four percentages on each person. */
function notePeriod(dir: Awaited<ReturnType<typeof fetchStaff>>) {
  const marks = useMarks.getState();
  // Verification needs the marks.id behind each person-week, and which of
  // them the Area Manager has already signed off.
  marks.noteMarkIds(dir.markIds);
  marks.noteVerified(dir.verified);
  marks.noteWeekNotes(dir.notes);
  marks.noteAdjusted(dir.adjusted);
  marks.noteMarkMax(dir.markMax);
}

/**
 * Switches the month the app is marking and looking at, and loads that
 * month's marks in place of the current one's. The week selection is kept
 * unless it has not started yet in the new month, in which case it falls
 * back to the latest week that has.
 *
 * The month-old maps are cleared before the fetch rather than after: a
 * person's week 2 in August and week 2 in September share a key, and a
 * verified tick carried across from the wrong month would lock a week that
 * is actually open.
 */
export async function selectMonth(monthIdx: number): Promise<void> {
  const marks = useMarks.getState();
  const idx = Math.max(0, Math.min(PERIODS.length - 1, monthIdx));
  if (idx === marks.monthIdx) return;

  marks.setMonth(idx);
  if (!weekStarted(PERIODS[idx], marks.weekIdx)) marks.setWeek(currentWeekIdx());
  marks.clearPeriod();
  if (!isSupabaseConfigured) return;

  marks.setPeriodLoading(true);
  try {
    const staff = await fetchStaff(PERIODS[idx], marks.scaleMax);
    // Only the marks changed; the directory rows are the same people.
    // Coverage (branchIds) came from user_branches and is kept from the
    // loaded copy rather than fetched again.
    const extra = new Map(useUsers.getState().users.map((u) => [u.id, u.branchIds]));
    useUsers.getState().hydrate(
      staff.users.map((u) => (extra.get(u.id) ? { ...u, branchIds: extra.get(u.id) } : u))
    );
    notePeriod(staff);
  } catch {
    // The month label has moved but its marks did not arrive: every week
    // reads as unmarked, which is at least visibly wrong rather than stale.
  } finally {
    useMarks.getState().setPeriodLoading(false);
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
  useTugasan.getState().hydrate({ entries: {}, signoffs: {} });
  useReminders.getState().hydrate([]);
  useMarks.getState().reset();
  useMyWeeks.getState().reset();
}
