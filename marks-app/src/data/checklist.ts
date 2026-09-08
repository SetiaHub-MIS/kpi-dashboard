export type Kategori = {
  no: number;
  name: string;
  lines: string[];
};

/** The 7 kategori / 22 perkara of the KP staff checklist, labels verbatim from the form. */
export const FORM: Kategori[] = [
  { no: 1, name: 'KEDATANGAN', lines: ['KEDATANGAN'] },
  { no: 2, name: 'DISPLIN', lines: ['DISPLIN'] },
  {
    no: 3,
    name: 'KEBERSIHAN BAHAGIAN',
    lines: ['A) LANTAI', 'B) RAK / TEMPAT KAUNTER', 'C) BARANG DISPLAY'],
  },
  {
    no: 4,
    name: 'KEKEMASAN BAHAGIAN',
    lines: ['A) BARANG DISPLAY', 'B) LEBIHAN BARANG'],
  },
  {
    no: 5,
    name: 'KEBERSIHAN & KEKEMASAN STOR',
    lines: ['KEBERSIHAN & KEKEMASAN STOR'],
  },
  {
    no: 6,
    name: 'PENYUSUAN BARANG',
    lines: [
      'A) PASTIKAN SETIAP BARANG SUSUN DI ATAS RAK',
      "B) 'FIRST IN FIRST OUT'",
      'C) TURUN & TAMBAH STOK',
      'D) PERIKSA BARANG TARIKH LUPUT',
      'E) REPACKING',
    ],
  },
  {
    no: 7,
    name: 'KEBERSIHAN KEDAI',
    lines: [
      'A) TANDAS',
      'B) KIPAS',
      'C) AIR-COND',
      'D) AIR COOLER',
      'E) SAWANG',
      'F) KAKI LIMA / PARKING LOT',
      'G) LONGKANG',
      'H) POTONG POKOK / RUMPUT',
      'I) PETI SEJUK',
    ],
  },
];

export const LINE_COUNT = FORM.reduce((n, k) => n + k.lines.length, 0);

/**
 * Pekerja stor are marked on their own criteria — receiving, stock rotation and
 * store safety rather than shop-floor display and cleanliness.
 *
 * NOT from the source workbooks: KP-STAFF-2026 and WS-SUPV-2026 have no store
 * checklist, so these perkara are a first draft to be replaced with the real form.
 */
export const STOR_FORM: Kategori[] = [
  {
    no: 1,
    name: 'PENERIMAAN BARANG',
    lines: [
      'A) SEMAK INVOIS & DELIVERY ORDER',
      'B) SEMAK KUANTITI & KEADAAN BARANG',
      'C) REKOD TERIMA DALAM SISTEM',
    ],
  },
  {
    no: 2,
    name: 'SUSUNAN STOK',
    lines: ['A) SUSUN IKUT KATEGORI', "B) 'FIRST IN FIRST OUT'", 'C) LABEL RAK JELAS'],
  },
  {
    no: 3,
    name: 'KAWALAN TARIKH LUPUT',
    lines: ['A) SEMAK TARIKH LUPUT MINGGUAN', 'B) ASINGKAN BARANG HAMPIR LUPUT'],
  },
  {
    no: 4,
    name: 'KEBERSIHAN STOR',
    lines: ['A) LANTAI STOR', 'B) RAK & PALET', 'C) SAMPAH & KADBOD'],
  },
  {
    no: 5,
    name: 'KESELAMATAN',
    lines: [
      'A) LALUAN KELUAR TIDAK DIHALANG',
      'B) ALAT PEMADAM API',
      'C) SUSUNAN TINGGI SELAMAT',
    ],
  },
  {
    no: 6,
    name: 'REKOD & STOK',
    lines: ['A) STOK TAKE MINGGUAN', 'B) REKOD BARANG ROSAK / PULANGAN', 'C) LAPOR STOK RENDAH'],
  },
];

export type FormKey = 'kedai' | 'stor';

export const FORMS: Record<FormKey, Kategori[]> = {
  kedai: FORM,
  stor: STOR_FORM,
};

export const FORM_LABEL: Record<FormKey, string> = {
  kedai: 'Checklist Pekerja Kedai',
  stor: 'Checklist Pekerja Stor',
};

export const countLines = (form: Kategori[]) =>
  form.reduce((n, k) => n + k.lines.length, 0);

export const STOR_LINE_COUNT = countLines(STOR_FORM);

export const lineKey = (katNo: number, lineIdx: number) => `${katNo}-${lineIdx}`;

export const MONTHS = ['JULAI 2026', 'OGOS 2026', 'SEPTEMBER 2026'];

/** The week currently being marked by SV/AS — Minggu 2 in the sample month. */
export const ACTIVE_WEEK = 1;
export const WEEK_COLS = ['M1', 'M2', 'M3', 'M4'];
