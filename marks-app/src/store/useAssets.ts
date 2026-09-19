import { create } from 'zustand';
import { User, canSeeBranch } from '@/data/users';
import { AssetRow } from '@/lib/assets';

type AssetsState = {
  rows: AssetRow[];
  hydrate: (rows: AssetRow[]) => void;
  setRow: (row: AssetRow) => void;
};

export const useAssets = create<AssetsState>((set) => ({
  rows: [],
  hydrate: (rows) => set({ rows }),
  setRow: (row) => set((s) => ({ rows: s.rows.map((r) => (r.id === row.id ? row : r)) })),
}));

/**
 * The asset log for every outlet this account covers — all of an Area
 * Manager's outlets, not only the home posting, and every outlet for the
 * Manager. RLS has already narrowed `rows` the same way; this is for the
 * screens, which group by outlet.
 */
export const assetsVisibleTo = (rows: AssetRow[], viewer: User | undefined): AssetRow[] =>
  rows.filter((r) => canSeeBranch(viewer, r.branchId));
