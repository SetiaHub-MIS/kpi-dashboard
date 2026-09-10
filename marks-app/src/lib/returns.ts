import {
  Disposition,
  ReturnReason,
  ReturnRecord,
  Stage,
} from '@/data/returns';
import { supabase } from '@/lib/supabase';

/**
 * The returns chain against Postgres.
 *
 * Two shape differences the app does not need to know about, converted here:
 *
 *   * The app keys a return by its `ref` (PR0001) because that is what appears
 *     on the bill and in every conversation. The database keys it by a serial
 *     `id`, which is what `return_events` points at. Both are carried.
 *   * The app holds `events` as stage -> date. The database holds one row per
 *     stage, which is what lets a stamp record who made it and when.
 *
 * Every read and write is scoped by RLS: the HQ stor team reach every outlet's
 * returns, an Area Manager only the ones they cover, and the cross-branch
 * manager and admin none at all.
 */

/** The database id behind a ref, needed to write events against it. */
export type ReturnIds = Record<string, number>;

type ReturnRow = {
  id: number;
  ref: string;
  branch_id: string;
  bill_no: string;
  bill_date: string;
  reason: ReturnReason;
  remark: string | null;
  disposition: Disposition | null;
  suppliers: { name: string } | { name: string }[] | null;
  branches: { name: string } | { name: string }[] | null;
  return_events: { stage: Stage; occurred_on: string }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : v;

export async function fetchReturns(): Promise<{ records: ReturnRecord[]; ids: ReturnIds }> {
  const { data, error } = await supabase
    .from('returns')
    .select(
      'id, ref, branch_id, bill_no, bill_date, reason, remark, disposition,' +
        ' suppliers(name), branches(name), return_events(stage, occurred_on)'
    )
    .order('ref');

  if (error) throw error;

  const ids: ReturnIds = {};
  const records = (data ?? []).map((r: any) => {
    const row = r as ReturnRow;
    ids[row.ref] = row.id;

    const events: Partial<Record<Stage, string>> = {};
    (row.return_events ?? []).forEach((e) => {
      events[e.stage] = e.occurred_on;
    });

    return {
      id: row.ref,
      branchId: row.branch_id,
      outlet: one(row.branches)?.name ?? row.branch_id,
      billNo: row.bill_no,
      billDate: row.bill_date,
      reason: row.reason,
      remark: row.remark ?? '',
      supplier: one(row.suppliers)?.name ?? '',
      disposition: row.disposition,
      events,
    } satisfies ReturnRecord;
  });

  return { records, ids };
}

/**
 * Finds or creates a supplier by name.
 *
 * Store staff type the name while logging a return rather than picking from a
 * list, so the same supplier arrives spelled several ways over a year. Matching
 * is case-insensitive to keep the obvious duplicates out; anything subtler is a
 * tidy-up job for admin, not something to guess at here.
 */
export async function supplierIdFor(name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: found, error: findErr } = await supabase
    .from('suppliers')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle();

  if (findErr) throw findErr;
  if (found) return found.id;

  const { data: made, error: makeErr } = await supabase
    .from('suppliers')
    .insert({ name: trimmed })
    .select('id')
    .single();

  if (makeErr) throw makeErr;
  return made.id;
}

/** The next free PR reference, read from what is already there. */
export async function nextRef(): Promise<string> {
  const { data, error } = await supabase
    .from('returns')
    .select('ref')
    .order('ref', { ascending: false })
    .limit(1);

  if (error) throw error;
  const highest = Number.parseInt((data?.[0]?.ref ?? 'PR0000').replace(/\D/g, ''), 10);
  return `PR${String((Number.isFinite(highest) ? highest : 0) + 1).padStart(4, '0')}`;
}

export type NewReturn = {
  ref: string;
  branchId: string;
  billNo: string;
  billDate: string;
  reason: ReturnReason;
  remark: string;
  supplier: string;
  receivedOn: string;
  createdBy: string;
};

/**
 * Logs a bill and stamps its first stage.
 *
 * The receipt is written as an event rather than a column so it reads the same
 * way as every later stage — one row, one date, one person.
 */
export async function createReturn(input: NewReturn): Promise<number> {
  const supplierId = await supplierIdFor(input.supplier);

  const { data, error } = await supabase
    .from('returns')
    .insert({
      ref: input.ref,
      branch_id: input.branchId,
      bill_no: input.billNo.trim(),
      bill_date: input.billDate,
      reason: input.reason,
      remark: input.remark.trim() || null,
      supplier_id: supplierId,
      created_by: input.createdBy,
    })
    .select('id')
    .single();

  if (error) throw error;

  await stampStage(data.id, 'received', input.receivedOn, input.createdBy);
  return data.id;
}

/**
 * Records that a stage happened. Unique on (return, stage), so stamping twice
 * corrects the date rather than adding a second history for the same step.
 */
export async function stampStage(
  returnId: number,
  stage: Stage,
  occurredOn: string,
  recordedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('return_events')
    .upsert(
      { return_id: returnId, stage, occurred_on: occurredOn, recorded_by: recordedBy },
      { onConflict: 'return_id,stage' }
    );
  if (error) throw error;
}

/** Removes a stamp — the undo behind a mis-tapped stage. */
export async function unstampStage(returnId: number, stage: Stage): Promise<void> {
  const { error } = await supabase
    .from('return_events')
    .delete()
    .eq('return_id', returnId)
    .eq('stage', stage);
  if (error) throw error;
}

/**
 * Segregation is where the route is decided, so it writes the disposition and
 * the stamp together. Clearing it later has to clear both, or a bill keeps a
 * route it is no longer on.
 */
export async function setDisposition(
  returnId: number,
  disposition: Disposition | null
): Promise<void> {
  const { error } = await supabase
    .from('returns')
    .update({ disposition })
    .eq('id', returnId);
  if (error) throw error;
}
