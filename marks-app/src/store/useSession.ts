import { create } from 'zustand';
import { User } from '@/data/users';
import {
  SignedInStaff,
  fetchSignedInStaff,
  signInWithPayroll,
  signOutOfSupabase,
} from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { findUser } from '@/store/useUsers';

/**
 * `currentUserId` is the payroll number throughout, signed in or picked from
 * the demo list. Every screen reads it the same way, so wiring real Auth
 * underneath changed nothing above this line.
 */
type SessionState = {
  currentUserId: string | null;
  /** The row Auth resolved to, when signed in for real. Null on the demo path. */
  staff: SignedInStaff | null;
  /** 'restoring' while a stored session is being checked on boot. */
  status: 'restoring' | 'idle' | 'working';
  error: string | null;

  /** Demo path: become someone without proving it. Kept for unconfigured runs. */
  signIn: (userId: string) => void;
  signInWithPassword: (payrollId: string, password: string) => Promise<SignedInStaff | null>;
  signOut: () => Promise<void>;
  /** Re-attaches a session that survived a restart. Called once at boot. */
  restore: () => Promise<void>;
  clearError: () => void;
};

export const useSession = create<SessionState>((set) => ({
  currentUserId: null,
  staff: null,
  status: isSupabaseConfigured ? 'restoring' : 'idle',
  error: null,

  signIn: (userId) => set({ currentUserId: userId, staff: null, error: null }),

  signInWithPassword: async (payrollId, password) => {
    set({ status: 'working', error: null });
    const result = await signInWithPayroll(payrollId, password);

    if (!result.ok) {
      set({ status: 'idle', error: result.message });
      return null;
    }

    set({ currentUserId: result.staff.id, staff: result.staff, status: 'idle', error: null });
    return result.staff;
  },

  signOut: async () => {
    await signOutOfSupabase();
    set({ currentUserId: null, staff: null, status: 'idle', error: null });
  },

  restore: async () => {
    if (!isSupabaseConfigured) {
      set({ status: 'idle' });
      return;
    }
    try {
      const staff = await fetchSignedInStaff();
      set({
        currentUserId: staff?.id ?? null,
        staff,
        status: 'idle',
        error: null,
      });
    } catch {
      // A stored session that no longer resolves is not an error worth showing;
      // it just means signing in again.
      set({ currentUserId: null, staff: null, status: 'idle' });
    }
  },

  clearError: () => set({ error: null }),
}));

/**
 * The directory row for the signed-in account. Falls back to what Auth returned
 * when the directory has not loaded yet, so the first render after sign-in
 * still knows the person's role.
 */
export const currentUser = (users: User[], currentUserId: string | null): User | undefined => {
  const found = findUser(users, currentUserId ?? undefined);
  if (found) return found;

  const staff = useSession.getState().staff;
  if (!staff || staff.id !== currentUserId) return undefined;
  return {
    ...staff,
    active: true,
    w: [null, null, null, null],
    perkara: [],
  };
};

/**
 * Which branch the signed-in account may see. null means cross-branch (admin),
 * which callers treat as "no filter".
 */
export const visibleBranch = (user: User | undefined): string | null => user?.branchId ?? null;
