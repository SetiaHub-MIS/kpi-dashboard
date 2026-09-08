export type AssetRow = {
  branchId: string;
  name: string;
  open: boolean;
  note?: string;
  age?: string;
};

/** Checklist Kedai asset log — filled weekly by the kedai supervisor. */
export const ASSETS: AssetRow[] = [
  {
    branchId: 'MCG',
    name: 'A) AIR-COND',
    open: true,
    note: '2 unit a/c tak sejuk; 1 unit on 20 minit NCB jatuh. Sdh report dlm group.',
    age: '34 hari terbuka',
  },
  { branchId: 'MCG', name: 'B) AIR COOLER', open: false },
  { branchId: 'MCG', name: 'C) LAMPU', open: false },
  { branchId: 'MCG', name: 'D) KIPAS', open: false },
  { branchId: 'MCG', name: 'E) KOMPUTER', open: false },
  { branchId: 'MCG', name: 'F) SALURAN AIR TANDAS', open: false },
  { branchId: 'MCG', name: 'G) KEBOCORAN AIR', open: false },
  { branchId: 'MCG', name: 'H) SIGNBOARD', open: false },
  { branchId: 'MCG', name: 'I) SPOTLIGHT', open: false },
  {
    branchId: 'MCG',
    name: 'J) LAIN-LAIN: TILE LANTAI',
    open: true,
    note: 'Tile lantai kedai ada yg rosak/pecah di beberapa tempat. Sdh report dlm group.',
    age: '12 hari terbuka',
  },

  // Kedai Kota Bharu — invented alongside that branch's staff.
  { branchId: 'KBR', name: 'A) AIR-COND', open: false },
  { branchId: 'KBR', name: 'B) AIR COOLER', open: false },
  { branchId: 'KBR', name: 'C) LAMPU', open: false },
  { branchId: 'KBR', name: 'D) KIPAS', open: false },
  { branchId: 'KBR', name: 'E) KOMPUTER', open: false },
  { branchId: 'KBR', name: 'F) SALURAN AIR TANDAS', open: false },
  {
    branchId: 'KBR',
    name: 'G) KEBOCORAN AIR',
    open: true,
    note: 'Paip belakang stor bocor sejak minggu lepas. Menunggu tukang paip.',
    age: '8 hari terbuka',
  },
  { branchId: 'KBR', name: 'H) SIGNBOARD', open: false },
  { branchId: 'KBR', name: 'I) SPOTLIGHT', open: false },
];

export const assetsOfBranch = (branchId: string | null): AssetRow[] =>
  branchId == null ? ASSETS : ASSETS.filter((a) => a.branchId === branchId);

export const ASSET_INSPECTOR = 'Khairul bin Talib';

export type NoteChip = { key: string; label: string; text: string };

export const NOTE_CHIPS: NoteChip[] = [
  {
    key: 'tandas',
    label: 'Tandas belum disapu',
    text: 'Tandas belum disapu masa handover. Perkara sama minggu lepas.',
  },
  {
    key: 'lewat',
    label: 'Lewat / kedatangan',
    text: 'Lewat 3 hari minggu ini; kedatangan perlu diperbaiki.',
  },
  {
    key: 'bagus',
    label: 'Kerja memuaskan',
    text: 'Kerja memuaskan. Susunan rak dan display kemas sepanjang minggu.',
  },
];
