import { currentPeriod } from '@/data/period';
import { fetchDirectory } from '@/lib/directory';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useBranches } from '@/store/useBranches';
import { useMarks } from '@/store/useMarks';
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
    return true;
  } catch {
    return false;
  }
}
