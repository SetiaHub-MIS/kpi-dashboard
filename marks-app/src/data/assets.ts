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
    branchId: 'DMC',
    name: 'A) AIR-COND',
    open: true,
    note: '2 unit a/c tak sejuk; 1 unit on 20 minit NCB jatuh. Sdh report dlm group.',
    age: '34 hari terbuka',
  },
  { branchId: 'DMC', name: 'B) AIR COOLER', open: false },
  { branchId: 'DMC', name: 'C) LAMPU', open: false },
  { branchId: 'DMC', name: 'D) KIPAS', open: false },
  { branchId: 'DMC', name: 'E) KOMPUTER', open: false },
  { branchId: 'DMC', name: 'F) SALURAN AIR TANDAS', open: false },
  { branchId: 'DMC', name: 'G) KEBOCORAN AIR', open: false },
  { branchId: 'DMC', name: 'H) SIGNBOARD', open: false },
  { branchId: 'DMC', name: 'I) SPOTLIGHT', open: false },
  {
    branchId: 'DMC',
    name: 'J) LAIN-LAIN: TILE LANTAI',
    open: true,
    note: 'Tile lantai kedai ada yg rosak/pecah di beberapa tempat. Sdh report dlm group.',
    age: '12 hari terbuka',
  },

  // Kedai Kota Bharu — invented alongside that branch's staff.
  { branchId: 'DKB', name: 'A) AIR-COND', open: false },
  { branchId: 'DKB', name: 'B) AIR COOLER', open: false },
  { branchId: 'DKB', name: 'C) LAMPU', open: false },
  { branchId: 'DKB', name: 'D) KIPAS', open: false },
  { branchId: 'DKB', name: 'E) KOMPUTER', open: false },
  { branchId: 'DKB', name: 'F) SALURAN AIR TANDAS', open: false },
  {
    branchId: 'DKB',
    name: 'G) KEBOCORAN AIR',
    open: true,
    note: 'Paip belakang stor bocor sejak minggu lepas. Menunggu tukang paip.',
    age: '8 hari terbuka',
  },
  { branchId: 'DKB', name: 'H) SIGNBOARD', open: false },
  { branchId: 'DKB', name: 'I) SPOTLIGHT', open: false },
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
