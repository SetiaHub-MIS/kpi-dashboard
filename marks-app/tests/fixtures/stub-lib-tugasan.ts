/**
 * Stand-in for src/lib/tugasan.ts: the same helpers, but the writes are
 * recorded instead of sent, and applied to two in-memory tables the way an
 * upsert applies them — only the fields sent change, and a new row starts
 * from the column defaults. The store imports two type names from here by
 * value, so they exist as placeholders.
 */
export { scopeParts, shortToIso, isoToShort } from '@/data/tugasanRows';

export const TugasanSnapshot = undefined;
export const WriteResult = undefined;

type Written = { kind: 'check' | 'signoff'; row: Record<string, unknown> };

/** Every write, in order, as it was sent. */
export const writes: Written[] = [];

/** Set to a promise to hold the next check write open, e.g. to type while it is in flight. */
export const gate: { next: Promise<void> | null } = { next: null };

type Key = { branchId: string; period: { year: number; month: number }; weekNo: number; itemKey?: string };
type Row = Record<string, unknown>;

const keyOf = (r: Key) => `${r.branchId}|${r.period.year}|${r.period.month}|${r.weekNo}|${r.itemKey ?? ''}`;
const KEY_FIELDS = new Set(['branchId', 'period', 'weekNo', 'itemKey']);

/** The rows as the tables hold them after every write so far. */
export const tables = { checks: new Map<string, Row>(), signoffs: new Map<string, Row>() };

function apply(table: Map<string, Row>, sent: Key & Row, defaults: Row) {
  const k = keyOf(sent);
  const merged = { ...(table.get(k) ?? defaults) };
  for (const [field, value] of Object.entries(sent)) {
    if (!KEY_FIELDS.has(field) && value !== undefined) merged[field] = value;
  }
  table.set(k, merged);
}

export const checkRow = (key: Key) => tables.checks.get(keyOf(key));
export const signoffRow = (key: Key) => tables.signoffs.get(keyOf({ ...key, itemKey: undefined }));

/** A row written from elsewhere — another phone — straight into the table. */
export const writeElsewhere = (kind: 'check' | 'signoff', row: Key & Row) =>
  kind === 'check'
    ? apply(tables.checks, row, { done: false, note: null, inspectedOn: null })
    : apply(tables.signoffs, row, { filledBy: null, checkedBy: null, signedOn: null });

export async function upsertTugasanCheck(row: Key & Row) {
  const sent = { ...row };
  const wait = gate.next;
  gate.next = null;
  if (wait) await wait;
  writes.push({ kind: 'check', row: sent });
  writeElsewhere('check', sent);
  return { ok: true };
}

export async function upsertTugasanSignoff(row: Key & Row) {
  const sent = { ...row };
  writes.push({ kind: 'signoff', row: sent });
  writeElsewhere('signoff', sent);
  return { ok: true };
}
