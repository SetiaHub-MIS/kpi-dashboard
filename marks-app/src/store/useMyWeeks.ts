import { create } from 'zustand';
import { StaffWeek, fetchMyWeeks } from '@/lib/marks';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * The signed-in person's own marks, for the four self-view screens.
 *
 * Kept in a store rather than fetched per screen because all four read the same
 * list — the summary, the record, the per-week detail and the profile average —
 * and a person tapping between them should not re-query each time.
 *
 * Empty is a real answer, not a loading state: a pekerja who has never been
 * marked has no weeks, and the screens say so rather than showing a fixture.
 */
type MyWeeksStore = {
  weeks: StaffWeek[];
  loading: boolean;
  /** The account the current list belongs to, so a switch reloads. */
  forUserId: string | null;
  load: (userId: string, scaleMax: number) => Promise<void>;
};

export const useMyWeeks = create<MyWeeksStore>((set, get) => ({
  weeks: [],
  loading: false,
  forUserId: null,

  load: async (userId, scaleMax) => {
    if (!isSupabaseConfigured) return;
    if (get().loading || (get().forUserId === userId && get().weeks.length > 0)) return;

    set({ loading: true });
    try {
      const weeks = await fetchMyWeeks(userId, scaleMax);
      set({ weeks, forUserId: userId, loading: false });
    } catch {
      // Offline or refused. Whatever was already loaded stays on screen.
      set({ loading: false });
    }
  },
}));

/**
 * The last few weekly percentages, oldest first — the sparkline on the summary.
 * Reversed because the list is newest first and a chart reads left to right.
 */
export const sparkOf = (weeks: StaffWeek[]): number[] =>
  [...weeks].reverse().map((w) => w.pct);
