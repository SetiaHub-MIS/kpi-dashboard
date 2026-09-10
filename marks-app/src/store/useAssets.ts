import { create } from 'zustand';
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

export const assetsOfBranch = (rows: AssetRow[], branchId: string | null): AssetRow[] =>
  branchId == null ? rows : rows.filter((r) => r.branchId === branchId);
