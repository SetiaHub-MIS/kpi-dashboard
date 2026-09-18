import { create } from 'zustand';
import { todayShort } from '@/data/period';
import {
  Role,
  SEED_USERS,
  User,
  branchesOf,
  canSeeBranch,
  initialsOf,
  isMarked,
  marksRoles,
  postingFor,
  seesStoreOps,
  shortOf,
} from '@/data/users';
import {
  CreateUserResult,
  WriteResult,
  createUser,
  updateUserActive,
  updateMyEmail,
  updateUserEmail,
  updateUserId,
  updateUserName,
  updateUserPosting,
  updateUserRole,
} from '@/lib/directory';
import { isSupabaseConfigured } from '@/lib/supabase';

export type RoleChange = {
  id: string;
  name: string;
  from: Role;
  to: Role;
  at: string;
};

type UsersState = {
  users: User[];
  /** Most recent first — promotions and demotions on record. */
  history: RoleChange[];
  /** Replaces the seed with rows read from Postgres. */
  hydrate: (users: User[]) => void;
  hydrateHistory: (history: RoleChange[]) => void;

  /** Written to Postgres first; the local list only grows once the row is accepted. */
  addUser: (input: {
    name: string;
    id: string;
    role: Role;
    branchId: string | null;
    /** Further outlets an Area Manager covers, beyond `branchId`. */
    extraBranchIds?: string[];
    email?: string | null;
  }) => Promise<CreateUserResult>;
  /**
   * Every edit below is written to Postgres first and applied locally only
   * once accepted, so what the admin sees is what the database holds. The
   * posting that follows a role change comes from postingFor(): head office
   * drops its branch, anyone leaving area_manager drops their extra outlets.
   */
  setRole: (id: string, role: Role, changedBy: string | null) => Promise<WriteResult>;
  setPosting: (
    id: string,
    branchId: string | null,
    extraBranchIds: string[],
    changedBy: string | null
  ) => Promise<WriteResult>;
  setActive: (id: string, active: boolean) => Promise<WriteResult>;
  setEmail: (id: string, email: string | null) => Promise<WriteResult>;
  /** A new payroll number; every record follows it. */
  setId: (from: string, to: string, changedBy: string | null) => Promise<WriteResult>;
  /** Full name and initials; the short form on cards follows the name. */
  setName: (id: string, name: string, init: string) => Promise<WriteResult>;
  /** The signed-in person's own address — no admin needed. */
  setMyEmail: (id: string, email: string | null) => Promise<WriteResult>;
};

export const useUsers = create<UsersState>((set, get) => ({
  users: SEED_USERS,
  history: [],

  hydrate: (users) => set({ users }),
  hydrateHistory: (history) => set({ history }),

  addUser: async ({ name, id, role, branchId, extraBranchIds = [], email = null }) => {
    const user: User = {
      id: id.trim().toUpperCase(),
      name: name.trim(),
      short: shortOf(name),
      init: initialsOf(name),
      role,
      branchId,
      ...(extraBranchIds.length > 0 ? { branchIds: extraBranchIds } : {}),
      email: email?.trim() ? email.trim().toLowerCase() : null,
      active: true,
      w: [null, null, null, null],
      perkara: [0, 0, 0, 0, 0, 0, 0],
    };
    if (isSupabaseConfigured) {
      const result = await createUser(user, extraBranchIds);
      if (!result.ok) return result;
      if (result.coverageError) {
        // The person is real; only the extra outlets are missing locally too.
        set((s) => ({ users: [...s.users, { ...user, branchIds: undefined }] }));
        return result;
      }
    }
    set((s) => ({ users: [...s.users, user] }));
    return { ok: true };
  },

  setRole: async (id, role, changedBy) => {
    const user = get().users.find((u) => u.id === id);
    if (!user || user.role === role) return { ok: true };
    const posting = postingFor(role, branchesOf(user));
    if (isSupabaseConfigured) {
      const result = await updateUserRole({ id, from: user.role, to: role, ...posting, changedBy });
      if (!result.ok) return result;
    }
    set((s) => ({
      users: s.users.map((u) =>
        u.id === id
          ? {
              ...u,
              role,
              branchId: posting.branchId,
              branchIds: posting.extraBranchIds.length > 0 ? posting.extraBranchIds : undefined,
            }
          : u
      ),
      history: [
        { id, name: user.name, from: user.role, to: role, at: todayShort() },
        ...s.history,
      ],
    }));
    return { ok: true };
  },

  setPosting: async (id, branchId, extraBranchIds, changedBy) => {
    const user = get().users.find((u) => u.id === id);
    if (!user) return { ok: true };
    if (isSupabaseConfigured) {
      const result = await updateUserPosting({
        id,
        fromBranchId: user.branchId,
        branchId,
        extraBranchIds,
        changedBy,
      });
      if (!result.ok) return result;
    }
    set((s) => ({
      users: s.users.map((u) =>
        u.id === id
          ? { ...u, branchId, branchIds: extraBranchIds.length > 0 ? extraBranchIds : undefined }
          : u
      ),
    }));
    return { ok: true };
  },

  setActive: async (id, active) => {
    if (isSupabaseConfigured) {
      const result = await updateUserActive(id, active);
      if (!result.ok) return result;
    }
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, active } : u)) }));
    return { ok: true };
  },

  setEmail: async (id, email) => {
    const value = email?.trim() ? email.trim().toLowerCase() : null;
    if (isSupabaseConfigured) {
      const result = await updateUserEmail(id, value);
      if (!result.ok) return result;
    }
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, email: value } : u)) }));
    return { ok: true };
  },

  setName: async (id, name, init) => {
    const full = name.trim();
    const short = shortOf(full);
    const initials = init.trim().toUpperCase();
    if (isSupabaseConfigured) {
      const result = await updateUserName({ id, name: full, short, init: initials });
      if (!result.ok) return result;
    }
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, name: full, short, init: initials } : u)),
      history: s.history.map((h) => (h.id === id ? { ...h, name: full } : h)),
    }));
    return { ok: true };
  },

  setId: async (from, to, changedBy) => {
    if (isSupabaseConfigured) {
      const result = await updateUserId({ from, to, changedBy });
      if (!result.ok) return result;
    }
    set((s) => ({
      users: s.users.map((u) => (u.id === from ? { ...u, id: to } : u)),
      history: s.history.map((h) => (h.id === from ? { ...h, id: to } : h)),
    }));
    return { ok: true };
  },

  setMyEmail: async (id, email) => {
    const value = email?.trim() ? email.trim().toLowerCase() : null;
    if (isSupabaseConfigured) {
      const result = await updateMyEmail(value);
      if (!result.ok) return result;
    }
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, email: value } : u)) }));
    return { ok: true };
  },
}));

export const findUser = (users: User[], id?: string): User | undefined =>
  users.find((u) => u.id === id);

/** Narrow to one kedai. A null branch means cross-branch, so nothing is filtered. */
export const inBranch = (users: User[], branchId: string | null): User[] =>
  branchId == null ? users : users.filter((u) => u.branchId === branchId);

export const byRole = (users: User[], role: Role): User[] =>
  users.filter((u) => u.role === role && u.active);

/** Everyone marked on a weekly checklist — kedai and stor alike. */
export const staffOf = (users: User[]): User[] =>
  users.filter((u) => u.active && isMarked(u.role));

/** The marked staff a supervisor or Area Manager at this branch is allowed to see. */
export const staffOfBranch = (users: User[], branchId: string | null): User[] =>
  inBranch(staffOf(users), branchId);

/**
 * The marked staff a given account may see. Branch scoping comes from
 * canSeeBranch, so an Area Manager gets every outlet assigned to them and head
 * office gets all of them; the stor exclusion drops pekerja stor for the
 * cross-branch manager. Mirrors app_can_see_mark() in the RLS policies.
 */
export const visibleStaff = (users: User[], viewer: User | undefined): User[] =>
  staffOf(users).filter(
    (u) =>
      canSeeBranch(viewer, u.branchId) &&
      (u.role !== 'store' || (viewer != null && seesStoreOps(viewer.role)))
  );

/**
 * The people this account is responsible for marking.
 *
 * Driven by the marking relation rather than by "who is measurable": once
 * supervisors became measurable, a flat list put every SV/AS in their own
 * marking queue alongside their crew. Self is excluded for the same reason —
 * nobody scores their own checklist.
 */
export const markingQueue = (users: User[], viewer: User | undefined): User[] => {
  const roles = marksRoles(viewer?.role);
  if (roles.length === 0) return [];
  return users.filter(
    (u) =>
      u.active &&
      u.id !== viewer?.id &&
      roles.includes(u.role) &&
      canSeeBranch(viewer, u.branchId)
  );
};

export const primaryOf = (users: User[], role: Role): User | undefined => byRole(users, role)[0];

export const primaryOfBranch = (
  users: User[],
  role: Role,
  branchId: string | null
): User | undefined => inBranch(byRole(users, role), branchId)[0];
