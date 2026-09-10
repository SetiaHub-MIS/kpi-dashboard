import { periodLabel, recentPeriods, todayIso, weekIndexOf } from '@/data/period';

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

/**
 * REAL: WS-SUPV-2026.xlsx, sheet `CHECKLIST SV`, labels verbatim — typo in
 * kategori 7 included, because it is what the form says.
 *
 * Titled "Checklist Mingguan (SA/CA/PT/TJH)" on the sheet. 14 kategori and 19
 * scoreable lines, but only 17 are scored in practice: PERIKSA METER SUBLOT and
 * LAIN-LAIN sit blank all year, and the workbook's own denominator is 85 — that
 * is 17 x 5, not 19 x 5. So a blank is not a zero here; it is excluded from the
 * total. That is why this form needs N/A and the other two do not.
 */
export const SV_FORM: Kategori[] = [
  { no: 1, name: 'KEDATANGAN', lines: ['KEDATANGAN'] },
  { no: 2, name: 'DISPLIN', lines: ['DISPLIN'] },
  { no: 3, name: 'KEBERSIHAN KEDAI', lines: ['KEBERSIHAN KEDAI'] },
  { no: 4, name: 'KEKEMASAN KEDAI', lines: ['KEKEMASAN KEDAI'] },
  { no: 5, name: 'KEROSAKAN ASET KEDAI', lines: ['KEROSAKAN ASET KEDAI'] },
  { no: 6, name: 'KEBOCORAN AIR', lines: ['KEBOCORAN AIR'] },
  { no: 7, name: 'KEAADAAN KEDAI', lines: ['KEAADAAN KEDAI'] },
  { no: 8, name: 'BARANG RETURN & TARIKH LUPUT', lines: ['BARANG RETURN & TARIKH LUPUT'] },
  { no: 9, name: 'STOK', lines: ['A) DISPLAY', 'B) LEBIHAN BARANG'] },
  { no: 10, name: 'JADUAL PEKERJA', lines: ['A) KEDATANGAN', 'B) JADUAL KEBERSIHAN'] },
  { no: 11, name: 'PERIKSA METER SUBLOT', lines: ['PERIKSA METER SUBLOT'] },
  {
    no: 12,
    name: 'DISPLAY BARANG PROMOSI DI TEMPAT VVIP',
    lines: ['DISPLAY BARANG PROMOSI DI TEMPAT VVIP'],
  },
  {
    no: 13,
    name: 'AMBIL PERHATIAN PESANAN DALAM GROUP',
    lines: ['AMBIL PERHATIAN PESANAN DALAM GROUP'],
  },
  {
    no: 14,
    name: 'KETELITIAN & TANGGUNGJAWAB TERHADAP KERJA',
    lines: ['A) SALES REPORT', 'B) INVOICE', 'C) BORANG HR', 'D) LAIN-LAIN'],
  },
];

export type FormKey = 'kedai' | 'stor' | 'sv';

export const FORMS: Record<FormKey, Kategori[]> = {
  kedai: FORM,
  stor: STOR_FORM,
  sv: SV_FORM,
};

export const FORM_LABEL: Record<FormKey, string> = {
  kedai: 'Checklist Pekerja Kedai',
  stor: 'Checklist Pekerja Stor',
  sv: 'Checklist SV/AS',
};

/**
 * Forms where a line may legitimately not apply, and is left out of the total
 * rather than scored zero. Only the SV form works this way — the workbook shows
 * it, and the other two score every line every week.
 */
export const FORMS_ALLOWING_NA: FormKey[] = ['sv'];

export const allowsNa = (formKey: FormKey) => FORMS_ALLOWING_NA.includes(formKey);

export const countLines = (form: Kategori[]) =>
  form.reduce((n, k) => n + k.lines.length, 0);

export const STOR_LINE_COUNT = countLines(STOR_FORM);

export const lineKey = (katNo: number, lineIdx: number) => `${katNo}-${lineIdx}`;

/**
 * The months the switcher offers, newest last. Derived from today rather than
 * written down, so the app does not quietly stop at a month someone typed in.
 */
export const PERIODS = recentPeriods(6);
export const MONTHS = PERIODS.map(periodLabel);

/**
 * Which of the four columns this week is, 0-based. Marking always lands in the
 * current week; the earlier ones are history and are read-only.
 */
export const ACTIVE_WEEK = weekIndexOf(todayIso());
export const WEEK_COLS = ['M1', 'M2', 'M3', 'M4'];
