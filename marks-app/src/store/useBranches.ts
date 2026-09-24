import { create } from 'zustand';
import { Branch, SEED_BRANCHES, branchLabel, defaultShort } from '@/data/branches';
import {
  WriteResult,
  createBranch,
  updateBranchActive,
  updateBranchName,
} from '@/lib/directory';
import { isSupabaseConfigured } from '@/lib/supabase';

type BranchesState = {
  branches: Branch[];
  /** Replaces the seed with rows read from Postgres. */
  hydrate: (branches: Branch[]) => void;
  /**
   * Each edit is written to Postgres first and applied locally only once
   * accepted, so what admin sees is what the database holds — a local-only
   * edit looked saved and was gone on the next reload.
   */
  addBranch: (input: { id: string; name: string; short: string }) => Promise<WriteResult>;
  renameBranch: (id: string, name: string, short: string) => Promise<WriteResult>;
  setBranchActive: (id: string, active: boolean) => Promise<WriteResult>;
};

export const useBranches = create<BranchesState>((set) => ({
  branches: SEED_BRANCHES,

  hydrate: (branches) => set({ branches }),

  addBranch: async ({ id, name, short }) => {
    const branch: Branch = {
      id: id.trim().toUpperCase(),
      name: name.trim(),
      short: short.trim() || defaultShort(name),
      active: true,
    };
    if (isSupabaseConfigured) {
      const result = await createBranch(branch);
      if (!result.ok) return result;
    }
    set((s) => ({ branches: [...s.branches, branch] }));
    return { ok: true };
  },

  renameBranch: async (id, name, short) => {
    const full = name.trim();
    const shortName = short.trim() || defaultShort(name);
    if (isSupabaseConfigured) {
      const result = await updateBranchName(id, full, shortName);
      if (!result.ok) return result;
    }
    set((s) => ({
      branches: s.branches.map((b) => (b.id === id ? { ...b, name: full, short: shortName } : b)),
    }));
    return { ok: true };
  },

  setBranchActive: async (id, active) => {
    if (isSupabaseConfigured) {
      const result = await updateBranchActive(id, active);
      if (!result.ok) return result;
    }
    set((s) => ({ branches: s.branches.map((b) => (b.id === id ? { ...b, active } : b)) }));
    return { ok: true };
  },
}));

/** Branches available to post people to. */
export const useActiveBranches = (): Branch[] =>
  useBranches((s) => s.branches).filter((b) => b.active);

/** Resolves a branch id to its display name against the live branch list. */
export function useBranchLabel() {
  const branches = useBranches((s) => s.branches);
  return (id: string | null | undefined) => branchLabel(branches, id);
}
