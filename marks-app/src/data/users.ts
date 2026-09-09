export type Role =
  | 'staff'
  | 'store'
  | 'clerk'
  | 'supervisor'
  | 'area_manager'
  | 'manager'
  | 'general_manager'
  | 'human_resources'
  | 'admin';

/**
 * Low to high. Pekerja kedai and pekerja stor sit on the same rung — they are
 * peers marked on different forms, so the ladder is not a straight line and
 * promotion/demotion is derived from ROLE_LEVEL rather than array order.
 */
export const ROLE_LADDER: Role[] = [
  'staff',
  'store',
  'clerk',
  'supervisor',
  'area_manager',
  'manager',
  'general_manager',
  'human_resources',
  'admin',
];

export const ROLE_LEVEL: Record<Role, number> = {
  staff: 0,
  store: 0,
  clerk: 0,
  supervisor: 1,
  area_manager: 2,
  manager: 3,
  general_manager: 4,
  human_resources: 4,
  admin: 5,
};

/**
 * Roles posted to head office rather than an outlet. Their branchId is null and
 * they read every branch, so anything that counts holders "per kedai" has to
 * count these globally instead.
 */
export const CROSS_BRANCH_ROLES: Role[] = [
  'manager',
  'general_manager',
  'human_resources',
  'admin',
];

export const isCrossBranch = (role: Role) => CROSS_BRANCH_ROLES.includes(role);

/**
 * The stor operation — returns and the 17-perkara checklist. Every role reaches
 * it except the cross-branch manager, whose remit stops at the kedai side.
 */
export const seesStoreOps = (role: Role) => role !== 'manager';

export const ROLE_LABEL: Record<Role, string> = {
  staff: 'Pekerja Kedai',
  store: 'Pekerja Stor',
  clerk: 'Kerani Stor',
  supervisor: 'SV / AS',
  area_manager: 'Area Manager',
  manager: 'Manager',
  general_manager: 'General Manager',
  human_resources: 'Human Resources',
  admin: 'Admin',
};

export const ROLE_BLURB: Record<Role, string> = {
  staff: 'Dinilai mingguan atas 22 perkara checklist kedai.',
  store: 'Dinilai mingguan atas 17 perkara checklist stor.',
  clerk: 'Uruskan panggilan pembekal dan pungutan barang pulangan.',
  supervisor: 'Menilai pekerja kedai dan stor setiap minggu.',
  area_manager: 'Sahkan markah SV/AS, pantau aset dan tugasan sendiri.',
  manager: 'Semua cawangan bahagian kedai. Tiada akses pulangan atau markah stor.',
  general_manager: 'Semua cawangan — analitik markah, KPI dan tugasan.',
  human_resources: 'Semua cawangan — analitik markah, KPI dan tugasan.',
  admin: 'Urus akaun, peranan dan kenaikan pangkat.',
};

/** Roles that get marked on a weekly checklist. */
export const MARKED_ROLES: Role[] = ['staff', 'store'];

export const isMarked = (role: Role) => MARKED_ROLES.includes(role);

/**
 * ID series follow the source workbooks: KP/MY are kedai staff numbers and WS
 * are supervisor numbers. AM/MG/GM/HR/AD are new — the workbooks never numbered
 * the Area Manager, head office or an admin.
 */
export const ROLE_PREFIX: Record<Role, string> = {
  staff: 'KP',
  store: 'ST',
  clerk: 'KR',
  supervisor: 'WS',
  area_manager: 'AM',
  manager: 'MG',
  general_manager: 'GM',
  human_resources: 'HR',
  admin: 'AD',
};

export type User = {
  /** Payroll number — permanent, keeps mark history attached across role changes. */
  id: string;
  name: string;
  short: string;
  init: string;
  role: Role;
  /** Which kedai this account belongs to. null = cross-branch (admin/HQ). */
  branchId: string | null;
  /**
   * Extra outlets an Area Manager covers, on top of branchId. Meaningless for
   * every other role — mirrors the user_branches table.
   */
  branchIds?: string[];
  active: boolean;
  /** Staff-checklist history: % per week, null = belum dinilai. */
  w: (number | null)[];
  /** Average % per kategori, index-aligned with FORM. */
  perkara: number[];
};

const noMarks: Pick<User, 'w' | 'perkara'> = {
  w: [null, null, null, null],
  perkara: [0, 0, 0, 0, 0, 0, 0],
};

export const SEED_USERS: User[] = [
  { id: 'KP0093', name: 'Syazana Izzah Zafirah', short: 'Syazana', init: 'SI', role: 'staff', branchId: 'MCG', active: true, w: [86, null, null, null], perkara: [100, 80, 84, 90, 80, 88, 72] },
  { id: 'KP0103', name: 'Putri Wahida Amalin', short: 'Putri W.', init: 'PW', role: 'staff', branchId: 'MCG', active: true, w: [81, 78, null, null], perkara: [100, 80, 80, 80, 80, 80, 76] },
  { id: 'KP0108', name: 'Nor Asyikin', short: 'Nor Asyikin', init: 'NA', role: 'staff', branchId: 'MCG', active: true, w: [81, null, null, null], perkara: [100, 80, 80, 80, 80, 80, 78] },
  { id: 'KP0110', name: 'Filzah Diyana', short: 'Filzah', init: 'FD', role: 'staff', branchId: 'MCG', active: true, w: [null, null, null, null], perkara: [0, 0, 0, 0, 0, 0, 0] },
  { id: 'KP0111', name: 'Puteri Nur Hafiza', short: 'Puteri N.', init: 'PN', role: 'staff', branchId: 'MCG', active: true, w: [74, 71, null, null], perkara: [80, 60, 72, 74, 70, 76, 68] },
  { id: 'MY0544', name: 'U Tin Tun', short: 'U Tin Tun', init: 'UT', role: 'staff', branchId: 'MCG', active: true, w: [81, 80, null, null], perkara: [100, 80, 80, 80, 80, 80, 80] },
  { id: 'MY0606', name: 'Ah San', short: 'Ah San', init: 'AS', role: 'staff', branchId: 'MCG', active: true, w: [81, null, null, null], perkara: [100, 80, 80, 80, 80, 80, 79] },
  { id: 'MY0644', name: 'Pyhi Si Thu', short: 'Pyhi Si Thu', init: 'PS', role: 'staff', branchId: 'MCG', active: true, w: [null, null, null, null], perkara: [0, 0, 0, 0, 0, 0, 0] },

  // perkara here is index-aligned with STOR_FORM's 6 kategori, not the kedai form's 7.
  { id: 'ST0001', name: 'Hafiz bin Osman', short: 'Hafiz', init: 'HO', role: 'store', branchId: 'MCG', active: true, w: [84, 81, null, null], perkara: [88, 84, 80, 76, 84, 80] },
  { id: 'ST0002', name: 'Ramesh a/l Kumaran', short: 'Ramesh', init: 'RK', role: 'store', branchId: 'MCG', active: true, w: [79, null, null, null], perkara: [80, 76, 72, 76, 80, 76] },
  { id: 'ST0003', name: 'Nurul Huda binti Salleh', short: 'Nurul H.', init: 'NH', role: 'store', branchId: 'MCG', active: true, w: [null, null, null, null], perkara: [0, 0, 0, 0, 0, 0] },

  { id: 'KR0001', name: 'Faridah binti Hassan', short: 'Faridah', init: 'FH', role: 'clerk', branchId: 'MCG', active: true, ...noMarks },

  { id: 'WS0001', name: 'Nur Syahirah', short: 'Nur Syahirah', init: 'NS', role: 'supervisor', branchId: 'MCG', active: true, ...noMarks },
  { id: 'AM0001', name: 'Herdi', short: 'Herdi', init: 'H', role: 'area_manager', branchId: 'MCG', branchIds: ['KBR'], active: true, ...noMarks },

  // Kedai Kota Bharu — invented so branch scoping can be exercised.
  { id: 'KP0201', name: 'Aina Sofea binti Roslan', short: 'Aina S.', init: 'AR', role: 'staff', branchId: 'KBR', active: true, w: [88, 85, null, null], perkara: [100, 88, 84, 88, 84, 88, 80] },
  { id: 'KP0202', name: 'Muhammad Danial bin Zulkifli', short: 'Danial', init: 'MZ', role: 'staff', branchId: 'KBR', active: true, w: [76, null, null, null], perkara: [80, 72, 76, 76, 72, 76, 72] },
  { id: 'KP0203', name: 'Lim Wei Jian', short: 'Wei Jian', init: 'LW', role: 'staff', branchId: 'KBR', active: true, w: [null, null, null, null], perkara: [0, 0, 0, 0, 0, 0, 0] },
  { id: 'ST0101', name: 'Sanjay a/l Muthu', short: 'Sanjay', init: 'SM', role: 'store', branchId: 'KBR', active: true, w: [83, null, null, null], perkara: [84, 84, 80, 80, 84, 84] },

  { id: 'KR0101', name: 'Chong Mei Ling', short: 'Mei Ling', init: 'CM', role: 'clerk', branchId: 'KBR', active: true, ...noMarks },

  { id: 'WS0012', name: 'Wan Nurul Nabilah Haizum', short: 'Wan Nurul', init: 'WN', role: 'supervisor', branchId: 'KBR', active: true, ...noMarks },
  { id: 'AM0002', name: 'Farah Adilah', short: 'Farah', init: 'FA', role: 'area_manager', branchId: 'KBR', active: true, ...noMarks },

  // INVENTED: head office. No workbook names these people; they exist so the
  // four cross-branch roles can be signed into and tested.
  { id: 'MG0001', name: 'Zulkarnain bin Ahmad', short: 'Zulkarnain', init: 'ZA', role: 'manager', branchId: null, active: true, ...noMarks },
  { id: 'GM0001', name: 'Tan Chee Keong', short: 'Chee Keong', init: 'TC', role: 'general_manager', branchId: null, active: true, ...noMarks },
  { id: 'HR0001', name: 'Siti Norhaliza binti Yusof', short: 'Siti N.', init: 'SN', role: 'human_resources', branchId: null, active: true, ...noMarks },

  { id: 'AD0001', name: 'Pentadbir Sistem', short: 'Pentadbir', init: 'PS', role: 'admin', branchId: null, active: true, ...noMarks },
];

/** Roles the kedai cannot be left without — blocks demoting the last holder. */
const REQUIRED_ROLES: Role[] = ['area_manager', 'admin'];

/** Every outlet a user reaches: their posting plus any extra Area Manager ones. */
export function branchesOf(user: User): string[] {
  if (user.branchId == null) return [];
  return [user.branchId, ...(user.branchIds ?? [])];
}

/**
 * Whether this account may act on a branch. Head office reaches everything; an
 * Area Manager reaches the outlets assigned to them; everyone else, their own.
 */
export function canSeeBranch(user: User | undefined, branchId: string | null): boolean {
  if (!user) return false;
  if (isCrossBranch(user.role)) return true;
  if (branchId == null) return false;
  return branchesOf(user).includes(branchId);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function shortOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim();
  return `${parts[0]} ${parts[1][0]}.`;
}

/** Next free number in a role's ID series, e.g. WS0013. */
export function nextIdFor(users: User[], role: Role): string {
  const prefix = ROLE_PREFIX[role];
  const highest = users
    .filter((u) => u.id.startsWith(prefix))
    .map((u) => Number.parseInt(u.id.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}

const rolesAtLevel = (level: number): Role[] =>
  ROLE_LADDER.filter((r) => ROLE_LEVEL[r] === level);

/** Roles one rung up — a promotion. */
export const promotionsFor = (role: Role): Role[] => rolesAtLevel(ROLE_LEVEL[role] + 1);

/** Roles one rung down. Demoting a supervisor can land on kedai or stor. */
export const demotionsFor = (role: Role): Role[] => rolesAtLevel(ROLE_LEVEL[role] - 1);

/** Same-rung roles — a sideways transfer, neither promotion nor demotion. */
export const transfersFor = (role: Role): Role[] =>
  rolesAtLevel(ROLE_LEVEL[role]).filter((r) => r !== role);

/**
 * Remaining holders of a user's role who would still cover their post.
 * Area Managers are counted per branch — losing the only one at a kedai strands
 * that kedai even when other branches have one. Head office is counted globally.
 */
function remainingHolders(users: User[], user: User): User[] {
  return users.filter(
    (u) =>
      u.active &&
      u.role === user.role &&
      u.id !== user.id &&
      (isCrossBranch(user.role) || u.branchId === user.branchId)
  );
}

function guard(users: User[], user: User, action: string): string | null {
  if (!REQUIRED_ROLES.includes(user.role)) return null;
  if (remainingHolders(users, user).length > 0) return null;
  const where = isCrossBranch(user.role) || !user.branchId ? '' : ` ${user.branchId}`;
  return `${ROLE_LABEL[user.role]}${where} terakhir — lantik pengganti dahulu sebelum ${action}.`;
}

/** Why a role change must be refused, or null when it is allowed. */
export function roleChangeBlocker(users: User[], id: string, next: Role): string | null {
  const user = users.find((u) => u.id === id);
  if (!user || user.role === next) return null;
  return guard(users, user, 'tukar peranan');
}

export function deactivateBlocker(users: User[], id: string): string | null {
  const user = users.find((u) => u.id === id);
  if (!user || !user.active) return null;
  return guard(users, user, 'nyahaktif');
}

/** Moving a branch also vacates a post, so it needs the same guard. */
export function branchChangeBlocker(users: User[], id: string, next: string | null): string | null {
  const user = users.find((u) => u.id === id);
  if (!user || user.branchId === next) return null;
  return guard(users, user, 'tukar cawangan');
}

/** Why a new account is invalid, or null when it can be created. */
export function newUserBlocker(users: User[], name: string, id: string): string | null {
  if (!name.trim()) return 'Nama diperlukan.';
  if (!id.trim()) return 'No. pekerja diperlukan.';
  if (users.some((u) => u.id.toLowerCase() === id.trim().toLowerCase())) {
    return `No. pekerja ${id.trim()} sudah wujud.`;
  }
  return null;
}
