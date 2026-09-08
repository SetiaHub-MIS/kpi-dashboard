import { create } from 'zustand';
import { User } from '@/data/users';
import { findUser } from '@/store/useUsers';

type SessionState = {
  /** Whose account the app is currently acting as. */
  currentUserId: string | null;
  signIn: (userId: string) => void;
  signOut: () => void;
};

export const useSession = create<SessionState>((set) => ({
  currentUserId: null,
  signIn: (userId) => set({ currentUserId: userId }),
  signOut: () => set({ currentUserId: null }),
}));

export const currentUser = (users: User[], currentUserId: string | null): User | undefined =>
  findUser(users, currentUserId ?? undefined);

/**
 * Which branch the signed-in account may see. null means cross-branch (admin),
 * which callers treat as "no filter".
 */
export const visibleBranch = (user: User | undefined): string | null => user?.branchId ?? null;
