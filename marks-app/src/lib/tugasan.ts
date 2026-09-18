import { PERIODS } from '@/data/checklist';
import {
  TugasanCheckRow,
  TugasanSignoffRow,
  TugasanSnapshot,
  snapshotFromRows,
} from '@/data/tugasanRows';
import { supabase } from '@/lib/supabase';

/**
 * TUGASAN AREA MANAGER against Postgres: tugasan_checks (one row per outlet ×
 * week × item) and tugasan_signoffs (one per outlet × week). The shape
 * mapping lives in data/tugasanRows.ts; this file only reads and writes.
 *
 * Who filled and who checked are payroll numbers with foreign keys, not the
 * typed names the workbook had; the screen resolves them to names.
 */

export type { TugasanCheckRow, TugasanSignoffRow, TugasanSnapshot } from '@/data/tugasanRows';
export { scopeParts, shortToIso, isoToShort } from '@/data/tugasanRows';

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
