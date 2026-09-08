import { create } from 'zustand';
import { Branch, SEED_BRANCHES, branchLabel, defaultShort } from '@/data/branches';

type BranchesState = {
  branches: Branch[];
  addBranch: (input: { id: string; name: string; short: string }) => void;
  renameBranch: (id: string, name: string, short: string) => void;
  setBranchActive: (id: string, active: boolean) => void;
};

export const useBranches = create<BranchesState>((set) => ({
  branches: SEED_BRANCHES,

  addBranch: ({ id, name, short }) =>
    set((s) => ({
      branches: [
        ...s.branches,
        {
          id: id.trim().toUpperCase(),
          name: name.trim(),
          short: short.trim() || defaultShort(name),
          active: true,
        },
      ],
    })),

  renameBranch: (id, name, short) =>
    set((s) => ({
      branches: s.branches.map((b) =>
        b.id === id ? { ...b, name: name.trim(), short: short.trim() || defaultShort(name) } : b
      ),
    })),

  setBranchActive: (id, active) =>
    set((s) => ({ branches: s.branches.map((b) => (b.id === id ? { ...b, active } : b)) })),
}));

/** Branches available to post people to. */
export const useActiveBranches = (): Branch[] =>
  useBranches((s) => s.branches).filter((b) => b.active);

/** Resolves a branch id to its display name against the live branch list. */
export function useBranchLabel() {
  const branches = useBranches((s) => s.branches);
  return (id: string | null | undefined) => branchLabel(branches, id);
}
