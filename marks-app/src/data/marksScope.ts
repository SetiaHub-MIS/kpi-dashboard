import { branchesOf } from '@/data/users';
import type { Role, User } from '@/data/users';

/**
 * The marks screens of the Manager and the Area Manager work one outlet at a
 * time (7 Oct 2026). The Manager covers every outlet; loading the whole
 * company's month of marks and per-perkara lines on sign-in made their
 * phones lag. Now only the outlet picked in the dropdown is loaded.
 */
export const scopesMarksByOutlet = (role: Role | undefined): boolean =>
  role === 'manager' || role === 'area_manager';

/**
 * The outlet loaded before anyone picks: an Area Manager's home outlet. The
 * Manager starts with none — nothing is loaded until they choose.
 */
export const defaultMarksOutlet = (role: Role | undefined, homeBranchId: string | null): string | null =>
  role === 'area_manager' ? homeBranchId : null;

/** The outlets the dropdown offers: every outlet for the Manager, the covered ones for an Area Manager. */
export function marksOutletsFor(user: User | undefined, allOutlets: string[]): string[] {
  if (!user) return [];
  if (user.role === 'manager') return allOutlets;
  if (user.role === 'area_manager') return branchesOf(user);
  return [];
}
