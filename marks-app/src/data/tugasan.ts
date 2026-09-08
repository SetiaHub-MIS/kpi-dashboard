export type TugasanItem = {
  key: string;
  label: string;
  /** Free-text ("SALES OK") vs an amount to be typed as a ringgit figure. */
  noteKind: 'amount' | 'status';
};

/**
 * TUGASAN AREA MANAGER — the manager's own weekly self-check, distinct from
 * the SV/AS-marked KP/WS checklists. PETI CASH logs a cash-count amount,
 * X REPORT logs the till-report status.
 */
export const TUGASAN_ITEMS: TugasanItem[] = [
  { key: 'peti_cash', label: 'A) PETI CASH', noteKind: 'amount' },
  { key: 'x_report', label: 'B) X REPORT', noteKind: 'status' },
];

export const tugasanKey = (itemKey: string, weekIdx: number) => `${itemKey}-${weekIdx}`;

/** Index into MONTHS (checklist.ts) that the seed data below belongs to — OGOS 2026. */
export const TUGASAN_SEED_MONTH_IDX = 1;

/** Tugasan is per manager's kedai, so entries are keyed by branch and month. */
export const tugasanScope = (branchId: string | null, monthIdx: number) =>
  `${branchId ?? 'ALL'}-${monthIdx}`;

/** The seeded Ogos block belongs to Kedai Machang, the branch the workbook covers. */
export const TUGASAN_SEED_SCOPE = tugasanScope('MCG', TUGASAN_SEED_MONTH_IDX);

/**
 * Verbatim from the source workbook: Ogos was fully self-checked by the
 * manager (tick + catatan every week), but week 4's TARIKH PEMERIKSAAN was
 * left blank — same kind of gap the rest of the app surfaces.
 */
export const TUGASAN_SEED_ENTRIES: Record<
  string,
  { done: boolean; note: string; tarikh: string }
> = {
  [tugasanKey('peti_cash', 0)]: { done: true, note: 'RM4,000', tarikh: '2/8/2026' },
  [tugasanKey('peti_cash', 1)]: { done: true, note: 'RM4,000', tarikh: '9/8/2026' },
  [tugasanKey('peti_cash', 2)]: { done: true, note: 'RM4,000', tarikh: '16/8/2026' },
  [tugasanKey('peti_cash', 3)]: { done: true, note: 'RM4,000', tarikh: '' },
  [tugasanKey('x_report', 0)]: { done: true, note: 'SALES OK', tarikh: '2/8/2026' },
  [tugasanKey('x_report', 1)]: { done: true, note: 'SALES OK', tarikh: '9/8/2026' },
  [tugasanKey('x_report', 2)]: { done: true, note: 'SALES OK', tarikh: '16/8/2026' },
  [tugasanKey('x_report', 3)]: { done: true, note: 'SALES OK', tarikh: '' },
};

/** Sign-off row, recorded once per week (spans both duties), not once a month. */
export const TUGASAN_SEED_SIGNOFF: Record<
  number,
  { diisikanOleh: string; diperiksaOleh: string; tarikh: string }
> = {
  0: { diisikanOleh: 'HERDI', diperiksaOleh: '', tarikh: '2/8/2026' },
  1: { diisikanOleh: 'HERDI', diperiksaOleh: '', tarikh: '9/8/2026' },
  2: { diisikanOleh: 'HERDI', diperiksaOleh: '', tarikh: '16/8/2026' },
  3: { diisikanOleh: 'HERDI', diperiksaOleh: '', tarikh: '23/8/2026' },
};
