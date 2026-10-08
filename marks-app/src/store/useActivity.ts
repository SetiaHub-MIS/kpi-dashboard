import { create } from 'zustand';
import type { RequestKind } from '@/data/activity';

/**
 * The first load after signing in or reopening the app (hydrateDirectory in
 * lib/hydrate.ts). Until it is 'done' the stores are empty, and a screen that
 * showed them would say "Tiada…" about data that is still on its way.
 */
export type FirstLoad = 'idle' | 'loading' | 'failed' | 'done';

type ActivityState = {
  /** Requests reading from the server right now. */
  loads: number;
  /** Requests writing to it right now. */
  saves: number;
  firstLoad: FirstLoad;
  /** Why the first load failed, for the banner (data/activity.ts errorDetail). */
  firstLoadError: string | null;
  /** Counts one request or step in; the function it returns counts it out, once. */
  begin: (kind: RequestKind) => () => void;
  setFirstLoad: (firstLoad: FirstLoad, error?: string | null) => void;
};

export const useActivity = create<ActivityState>((set) => ({
  loads: 0,
  saves: 0,
  firstLoad: 'idle',
  firstLoadError: null,

  begin: (kind) => {
    const bump = (by: number) =>
      set((s) =>
        kind === 'save'
          ? { saves: Math.max(0, s.saves + by) }
          : { loads: Math.max(0, s.loads + by) },
      );
    bump(1);
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      bump(-1);
    };
  },

  setFirstLoad: (firstLoad, error = null) => set({ firstLoad, firstLoadError: error }),
}));
