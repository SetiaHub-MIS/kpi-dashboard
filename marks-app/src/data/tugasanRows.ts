import { PERIODS } from '@/data/checklist';
import type { Period } from '@/data/period';
import { pad } from '@/data/period';
import { tugasanKey, tugasanScope } from '@/data/tugasan';

/**
 * The mapping between the Tugasan screen's model and the tugasan_checks /
 * tugasan_signoffs tables. Pure — no client here — so it can be tested on
 * its own and the lib that talks to Postgres stays thin.
 *
 * The app keys everything by a scope string, `${branchId}-${monthIdx}`, where
 * monthIdx indexes PERIODS — the six months the switcher offers. The tables
 * key by (branch_id, period_year, period_month, week_no). The two are mapped
 * here and nowhere else.
 */

export type TugasanCheckRow = {
  branchId: string;
  period: Period;
  weekNo: number; // 1..4
  itemKey: string;
  done: boolean;
  note: string | null;
  inspectedOn: string | null; // ISO date
};

export type TugasanSignoffRow = {
  branchId: string;
  period: Period;
  weekNo: number;
  filledBy: string | null;
  checkedBy: string | null;
  signedOn: string | null; // ISO date
};

// ------------------------------------------------------------ scopes ----

/** `${branchId}-${monthIdx}` back into its parts. Branch codes never contain '-'. */
export function scopeParts(scope: string): { branchId: string; period: Period } | null {
  const at = scope.lastIndexOf('-');
  if (at <= 0) return null;
  const branchId = scope.slice(0, at);
  const monthIdx = Number(scope.slice(at + 1));
  const period = PERIODS[monthIdx];
  if (branchId === 'ALL' || !period) return null;
  return { branchId, period };
}

const monthIdxOf = (p: Period): number =>
  PERIODS.findIndex((q) => q.year === p.year && q.month === p.month);

// ------------------------------------------------------------- dates ----

/**
 * The workbook writes dates as D/M/YYYY and so does the app. The column is a
 * date, so the text has to parse — or the entry is refused, not quietly
 * dropped. ISO input is accepted too, since that is what comes back.
 */
export function shortToIso(text: string): string | null {
  const v = text.trim();
  if (!v) return null;
  let d: number, m: number, y: number;
  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return null;
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function isoToShort(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}/${m}/${y}`;
}

// -------------------------------------------------------------- reads ----

export type TugasanSnapshot = {
  /** scope -> tugasanKey -> entry */
  entries: Record<string, Record<string, { done: boolean; note: string; tarikh: string }>>;
  /** scope -> weekIdx -> sign-off */
  signoffs: Record<
    string,
    Record<number, { filledBy: string | null; checkedBy: string | null; tarikh: string }>
  >;
};

/** Rows for the months the switcher can show, in the store's shape. */
export function snapshotFromRows(
  checks: TugasanCheckRow[],
  signoffs: TugasanSignoffRow[]
): TugasanSnapshot {
  const out: TugasanSnapshot = { entries: {}, signoffs: {} };
  for (const c of checks) {
    const idx = monthIdxOf(c.period);
    if (idx < 0) continue;
    const scope = tugasanScope(c.branchId, idx);
    (out.entries[scope] ??= {})[tugasanKey(c.itemKey, c.weekNo - 1)] = {
      done: c.done,
      note: c.note ?? '',
      tarikh: isoToShort(c.inspectedOn),
    };
  }
  for (const s of signoffs) {
    const idx = monthIdxOf(s.period);
    if (idx < 0) continue;
    const scope = tugasanScope(s.branchId, idx);
    (out.signoffs[scope] ??= {})[s.weekNo - 1] = {
      filledBy: s.filledBy,
      checkedBy: s.checkedBy,
      tarikh: isoToShort(s.signedOn),
    };
  }
  return out;
}
