export type Branch = {
  /** Short code used as the branch key and shown against staff numbers. */
  id: string;
  name: string;
  short: string;
  active: boolean;
};

/** HQ Jenjarom is the central store, not a kedai. Pekerja stor and kerani stor
 * are posted there and serve every outlet; nobody is marked on a kedai
 * checklist at HQ. */
export const HQ_BRANCH_ID = 'HQ';

export const isHq = (id: string | null | undefined) => id === HQ_BRANCH_ID;

/**
 * REAL: uploads/Cawangan.xlsx — HQ plus 38 outlets, codes verbatim.
 * These are the same codes the stock system's export uses, so a returns CSV
 * saying DMC reconciles against Kedai Machang without a translation table.
 */
export const SEED_BRANCHES: Branch[] = [
  { id: 'HQ', name: 'HQ Jenjarom', short: 'HQ', active: true },
  { id: 'AKK', name: 'Kedai Kuala Kangsar', short: 'Kuala Kangsar', active: true },
  { id: 'APR', name: 'Kedai Pantai Remis', short: 'Pantai Remis', active: true },
  { id: 'ASP', name: 'Kedai Sungai Siput', short: 'Sungai Siput', active: true },
  { id: 'ASU', name: 'Kedai Sungai Sumun', short: 'Sungai Sumun', active: true },
  { id: 'BBT', name: 'Kedai Banting', short: 'Banting', active: true },
  { id: 'BKP', name: 'Kedai Kapar', short: 'Kapar', active: true },
  { id: 'BLB', name: 'Kedai Kg. Lombong', short: 'Kg. Lombong', active: true },
  { id: 'BPC', name: 'Kedai Puchong', short: 'Puchong', active: true },
  { id: 'BPG', name: 'Kedai Teluk Panglima Garang', short: 'Teluk Panglima Garang', active: true },
  { id: 'BRP', name: 'Kedai Rantau Panjang', short: 'Rantau Panjang', active: true },
  { id: 'BSK', name: 'Kedai Sekinchan', short: 'Sekinchan', active: true },
  { id: 'BSM', name: 'Kedai Semenyih', short: 'Semenyih', active: true },
  { id: 'BTS', name: 'Kedai Taman Sentosa', short: 'Taman Sentosa', active: true },
  { id: 'CJR', name: 'Kedai Jerantut', short: 'Jerantut', active: true },
  { id: 'DKB', name: 'Kedai Kota Bharu', short: 'Kota Bharu', active: true },
  { id: 'DKD', name: 'Kedai Kadok', short: 'Kadok', active: true },
  { id: 'DKK', name: 'Kedai Kok Lanas', short: 'Kok Lanas', active: true },
  { id: 'DMC', name: 'Kedai Machang', short: 'Machang', active: true },
  { id: 'DMU', name: 'Kedai Machang Uptown', short: 'Machang Uptown', active: true },
  { id: 'DPM', name: 'Kedai Pasir Mas', short: 'Pasir Mas', active: true },
  { id: 'DSS', name: 'Kedai Selising', short: 'Selising', active: true },
  { id: 'DTD', name: 'Kedai Tendong', short: 'Tendong', active: true },
  { id: 'DTP', name: 'Kedai Tumpat', short: 'Tumpat', active: true },
  { id: 'DWB', name: 'Kedai Wakaf Baru', short: 'Wakaf Baru', active: true },
  { id: 'DWS', name: 'Kedai Wakaf Siku', short: 'Wakaf Siku', active: true },
  { id: 'KBL', name: 'Kedai Baling', short: 'Baling', active: true },
  { id: 'KKT', name: 'Kedai Kuala Ketil', short: 'Kuala Ketil', active: true },
  { id: 'NBH', name: 'Kedai Bahau', short: 'Bahau', active: true },
  { id: 'NPD', name: 'Kedai Port Dickson', short: 'Port Dickson', active: true },
  { id: 'NS2', name: 'Kedai Seremban 2', short: 'Seremban 2', active: true },
  { id: 'NSK', name: 'Kedai Sikamat', short: 'Sikamat', active: true },
  { id: 'NTM', name: 'Kedai Seremban', short: 'Seremban', active: true },
  { id: 'PMB', name: 'Kedai Machang Bubok', short: 'Machang Bubok', active: true },
  { id: 'PSJ', name: 'Kedai Sungai Jawi', short: 'Sungai Jawi', active: true },
  { id: 'QPJ', name: 'Kedai Miri', short: 'Miri', active: true },
  { id: 'TKM', name: 'Kedai Kemaman', short: 'Kemaman', active: true },
  { id: 'VBC', name: 'Kedai Batu Caves', short: 'Batu Caves', active: true },
  { id: 'VTR', name: 'Kedai Tun Razak', short: 'Tun Razak', active: true },
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
