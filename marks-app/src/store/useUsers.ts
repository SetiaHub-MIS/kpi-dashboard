import { create } from 'zustand';
import {
  Role,
  SEED_USERS,
  User,
  canSeeBranch,
  initialsOf,
  isMarked,
  seesStoreOps,
  shortOf,
} from '@/data/users';

export type RoleChange = {
  id: string;
  name: string;
  from: Role;
  to: Role;
  at: string;
};

type UsersState = {
  users: User[];
  /** Most recent first — promotions and demotions made in-app. */
  history: RoleChange[];

  addUser: (input: { name: string; id: string; role: Role; branchId: string | null }) => void;
  setRole: (id: string, role: Role, at: string) => void;
  setBranch: (id: string, branchId: string | null) => void;
  setActive: (id: string, active: boolean) => void;
};

export const useUsers = create<UsersState>((set) => ({
  users: SEED_USERS,
  history: [],

  addUser: ({ name, id, role, branchId }) =>
    set((s) => ({
      users: [
        ...s.users,
        {
          id: id.trim().toUpperCase(),
          name: name.trim(),
          short: shortOf(name),
          init: initialsOf(name),
          role,
          branchId,
          active: true,
          w: [null, null, null, null],
          perkara: [0, 0, 0, 0, 0, 0, 0],
        },
      ],
    })),

  setRole: (id, role, at) =>
    set((s) => {
      const user = s.users.find((u) => u.id === id);
      if (!user || user.role === role) return s;
      return {
        users: s.users.map((u) => (u.id === id ? { ...u, role } : u)),
        history: [{ id, name: user.name, from: user.role, to: role, at }, ...s.history],
      };
    }),

  setBranch: (id, branchId) =>
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, branchId } : u)) })),

  setActive: (id, active) =>
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, active } : u)) })),
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

export const primaryOf = (users: User[], role: Role): User | undefined => byRole(users, role)[0];

export const primaryOfBranch = (
  users: User[],
  role: Role,
  branchId: string | null
): User | undefined => inBranch(byRole(users, role), branchId)[0];
