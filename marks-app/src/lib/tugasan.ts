import { PERIODS } from '@/data/checklist';
import { Period, pad } from '@/data/period';
import { tugasanKey, tugasanScope } from '@/data/tugasan';
import { supabase } from '@/lib/supabase';

/**
 * TUGASAN AREA MANAGER against Postgres: tugasan_checks (one row per outlet ×
 * week × item) and tugasan_signoffs (one per outlet × week).
 *
 * The app keys everything by a scope string, `${branchId}-${monthIdx}`, where
 * monthIdx indexes PERIODS — the six months the switcher offers. The tables
 * key by (branch_id, period_year, period_month, week_no). The two are mapped
 * here and nowhere else.
 *
 * Who filled and who checked are payroll numbers with foreign keys, not the
 * typed names the workbook had; the screen resolves them to names.
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

export async function fetchTugasan(): Promise<TugasanSnapshot> {
  const since = PERIODS[0];
  const [checks, signoffs] = await Promise.all([
    supabase
      .from('tugasan_checks')
      .select('branch_id, period_year, period_month, week_no, item_key, done, note, inspected_on')
      .gte('period_year', since.year),
    supabase
      .from('tugasan_signoffs')
      .select('branch_id, period_year, period_month, week_no, filled_by, checked_by, signed_on')
      .gte('period_year', since.year),
  ]);
  if (checks.error) throw checks.error;
  if (signoffs.error) throw signoffs.error;

  return snapshotFromRows(
    (checks.data ?? []).map((r: any) => ({
      branchId: r.branch_id,
      period: { year: r.period_year, month: r.period_month },
      weekNo: r.week_no,
      itemKey: r.item_key,
      done: r.done,
      note: r.note,
      inspectedOn: r.inspected_on,
    })),
    (signoffs.data ?? []).map((r: any) => ({
      branchId: r.branch_id,
      period: { year: r.period_year, month: r.period_month },
      weekNo: r.week_no,
      filledBy: r.filled_by,
      checkedBy: r.checked_by,
      signedOn: r.signed_on,
    }))
  );
}

// ------------------------------------------------------------- writes ----

export type WriteResult = { ok: true } | { ok: false; message: string };

const asResult = (error: { message: string } | null): WriteResult =>
  error ? { ok: false, message: error.message } : { ok: true };

/** One tick, note and date. Upsert: the row exists once anything was recorded. */
export async function upsertTugasanCheck(row: TugasanCheckRow): Promise<WriteResult> {
  const { error } = await supabase.from('tugasan_checks').upsert(
    {
      branch_id: row.branchId,
      period_year: row.period.year,
      period_month: row.period.month,
      week_no: row.weekNo,
      item_key: row.itemKey,
      done: row.done,
      note: row.note,
      inspected_on: row.inspectedOn,
    },
    { onConflict: 'branch_id,period_year,period_month,week_no,item_key' }
  );
  return asResult(error);
}

export async function upsertTugasanSignoff(row: TugasanSignoffRow): Promise<WriteResult> {
  const { error } = await supabase.from('tugasan_signoffs').upsert(
    {
      branch_id: row.branchId,
      period_year: row.period.year,
      period_month: row.period.month,
      week_no: row.weekNo,
      filled_by: row.filledBy,
      checked_by: row.checkedBy,
      signed_on: row.signedOn,
    },
    { onConflict: 'branch_id,period_year,period_month,week_no' }
  );
  return asResult(error);
}
