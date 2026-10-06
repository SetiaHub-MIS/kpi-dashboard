import type { Role } from '@/data/users';

/**
 * Where each role lands after signing in — and, by the same token, the
 * section of the app that is theirs. `mayOpen()` reads its sections from here,
 * so giving a role a new home moves its access with it.
 */
export const HOME_ROUTE: Record<Role, string> = {
  staff: '/staff',
  store: '/pulangan',
  clerk: '/pulangan',
  supervisor: '/supervisor',
  area_manager: '/manager',
  // The Manager works the Area Manager's screens over every outlet.
  manager: '/manager',
  // The GM uses the reporting web app; a sign-in here is turned away (see
  // SignInForm) and a restored session is signed out (see app/index).
  general_manager: '/',
  // HR administers beside Admin: the same console, nothing else.
  human_resources: '/admin',
  admin: '/admin',
};

/** Each section (/staff, /supervisor, /manager, /pulangan, /admin) → the roles whose home it is. */
const SECTION_OWNERS: Record<string, Role[]> = {};
for (const [role, home] of Object.entries(HOME_ROUTE) as [Role, string][]) {
  if (home !== '/') (SECTION_OWNERS[home] ??= []).push(role);
}

/**
 * May a signed-in role open this path? A section belongs to the roles whose
 * home it is, and admin may open any. A typed URL used to be enough: staff at
 * an outlet could open /manager/tugasan and read it.
 *
 * Paths outside the sections — person and mark detail, a week, the account
 * screen — are shared between roles and stay open here; RLS scopes what they
 * show.
 */
export function mayOpen(role: Role, pathname: string): boolean {
  if (role === 'admin') return true;
  const owners = SECTION_OWNERS[`/${pathname.split('/')[1] ?? ''}`];
  return owners == null || owners.includes(role);
}
