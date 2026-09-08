/** Marks the MANAGER has already signed off, keyed `${personId}-${weekIndex}`. */
export const VERIFIED: Record<string, boolean> = {
  'KP0093-0': true,
  'KP0103-0': true,
  'MY0544-0': true,
};

/** Catatan left by the SV/AS, keyed `${personId}-${weekIndex}`. */
export const WEEK_NOTES: Record<string, string> = {
  'KP0093-0': 'Kedatangan penuh. Tandas belum disapu masa handover — kali kedua bulan ni.',
  'KP0103-1': 'Rak kaunter kemas. Lebihan barang tak dipulangkan ke stor.',
  'KP0111-0': 'Lewat 3 hari minggu ni. Sawang di bahagian atas rak belum dibersihkan.',
};

export const KEDAI = 'Kedai Machang';

/** Whose account the Pekerja role signs in as. */
export const ME_ID = 'KP0093';

export type StaffWeek = {
  label: string;
  pct: number;
  total: number;
  unread: boolean;
  note: string;
  perkara: number[];
};

export const STAFF_WEEKS: StaffWeek[] = [
  {
    label: 'Minggu 1 · 1–7 Sep',
    pct: 86,
    total: 95,
    unread: true,
    note: 'Kedatangan penuh dan display kemas. Tandas belum disapu masa handover — kali kedua bulan ni, tolong ambil perhatian.',
    perkara: [100, 80, 84, 90, 80, 88, 72],
  },
  {
    label: 'Ogos · Minggu 4',
    pct: 83,
    total: 91,
    unread: false,
    note: 'Susunan barang bagus. Sawang atas rak belum dibersihkan.',
    perkara: [100, 80, 80, 84, 80, 84, 74],
  },
  {
    label: 'Ogos · Minggu 3',
    pct: 81,
    total: 89,
    unread: false,
    note: 'Semua okey. Repacking lambat sikit hari Khamis.',
    perkara: [100, 80, 80, 80, 80, 76, 76],
  },
  {
    label: 'Ogos · Minggu 2',
    pct: 78,
    total: 86,
    unread: false,
    note: 'Lewat 2 hari. Lantai bahagian belum dimop sebelum tutup.',
    perkara: [80, 80, 76, 80, 80, 80, 72],
  },
];

export const STAFF_SPARK = [78, 81, 83, 79, 84, 81, 83, 86];
