export type Branch = {
  /** Short code used as the branch key and shown against staff numbers. */
  id: string;
  name: string;
  short: string;
  active: boolean;
};

/**
 * Kedai Machang is the branch the source workbooks cover. Kota Bharu is
 * invented so branch scoping can be exercised. Admin can add more in-app.
 */
export const SEED_BRANCHES: Branch[] = [
  { id: 'MCG', name: 'Kedai Machang', short: 'Machang', active: true },
  { id: 'KBR', name: 'Kedai Kota Bharu', short: 'Kota Bharu', active: true },
];

export const findBranch = (branches: Branch[], id: string | null | undefined) =>
  branches.find((b) => b.id === id);

/** Label for a branch id, including the cross-branch (HQ) case used by admin. */
export const branchLabel = (
  branches: Branch[],
  id: string | null | undefined
): string => (id == null ? 'Semua cawangan' : (findBranch(branches, id)?.name ?? id));

/** Button-sized name: "Kedai Pasir Mas" -> "Pasir Mas". */
export const defaultShort = (name: string) => name.trim().replace(/^kedai\s+/i, '');

/** A code derived from the kedai name, e.g. "Kedai Pasir Mas" -> "PM". */
export function suggestBranchCode(name: string, branches: Branch[]): string {
  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w && w !== 'KEDAI');

  const base =
    words.length >= 2
      ? words.map((w) => w[0]).join('').slice(0, 3)
      : (words[0] ?? '').slice(0, 3);

  if (!base) return '';
  if (!branches.some((b) => b.id === base)) return base;

  for (let n = 2; n < 100; n++) {
    const candidate = `${base.slice(0, 2)}${n}`;
    if (!branches.some((b) => b.id === candidate)) return candidate;
  }
  return base;
}

/** Why a new branch is invalid, or null when it can be created. */
export function newBranchBlocker(
  branches: Branch[],
  name: string,
  code: string
): string | null {
  if (!name.trim()) return 'Nama cawangan diperlukan.';
  if (!code.trim()) return 'Kod cawangan diperlukan.';
  if (!/^[A-Z0-9]{2,5}$/.test(code.trim().toUpperCase())) {
    return 'Kod mesti 2–5 huruf atau nombor.';
  }
  if (branches.some((b) => b.id === code.trim().toUpperCase())) {
    return `Kod ${code.trim().toUpperCase()} sudah digunakan.`;
  }
  return null;
}

/**
 * A branch with people still posted to it cannot be closed — they would be
 * left invisible to every supervisor and manager.
 */
export function closeBranchBlocker(assignedCount: number): string | null {
  return assignedCount > 0
    ? `${assignedCount} akaun masih di cawangan ini. Pindahkan mereka dahulu.`
    : null;
}
