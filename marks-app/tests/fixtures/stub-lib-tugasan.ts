/**
 * Stand-in for src/lib/tugasan.ts: the same helpers, but the writes are
 * recorded instead of sent. The store imports two type names from here by
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

export async function upsertTugasanCheck(row: Record<string, unknown>) {
  const sent = { ...row };
  const wait = gate.next;
  gate.next = null;
  if (wait) await wait;
  writes.push({ kind: 'check', row: sent });
  return { ok: true };
}

export async function upsertTugasanSignoff(row: Record<string, unknown>) {
  writes.push({ kind: 'signoff', row: { ...row } });
  return { ok: true };
}
