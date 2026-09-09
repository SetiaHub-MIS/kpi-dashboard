import type { SubmitMarkInput } from '@/lib/marks';

/**
 * The offline queue's rules, with no storage or network in sight so they can be
 * tested directly.
 *
 * The shape of the problem: a supervisor marks people in a stockroom with no
 * signal, and the phone syncs later — sometimes much later. By then the week
 * may already hold a mark someone else wrote. The ruling is first write wins:
 * what is in Postgres stands, and the queued mark is handed back so the
 * supervisor is told rather than having their work vanish or overwrite someone.
 */

export type QueuedMark = {
  /** Local id. Not the marks.id — this row may never reach Postgres. */
  id: string;
  input: SubmitMarkInput;
  queuedAt: string;
  attempts: number;
  lastError?: string;
};

export type RejectedMark = {
  id: string;
  input: SubmitMarkInput;
  queuedAt: string;
  rejectedAt: string;
  /** The person's name at the time, so the message can be read months later. */
  personLabel: string;
};

export type QueueState = {
  pending: QueuedMark[];
  rejected: RejectedMark[];
};

export const emptyQueue: QueueState = { pending: [], rejected: [] };

/** Which week a queued mark is for. Two entries with the same slot collide. */
export const slotOf = (i: SubmitMarkInput) =>
  `${i.userId}-${i.period.year}-${i.period.month}-${i.weekNo}`;

/**
 * Adds a mark to the queue.
 *
 * A second offline mark for the same person and week replaces the first rather
 * than joining it: both were typed by the same person on the same device, so
 * the later one is a correction, not a competitor. Only marks from *elsewhere*
 * are conflicts, and those are decided by the database.
 */
export function enqueue(state: QueueState, item: QueuedMark): QueueState {
  const slot = slotOf(item.input);
  return {
    ...state,
    pending: [...state.pending.filter((q) => slotOf(q.input) !== slot), item],
  };
}

/** Drops a queued mark that reached Postgres. */
export function settle(state: QueueState, id: string): QueueState {
  return { ...state, pending: state.pending.filter((q) => q.id !== id) };
}

/**
 * Moves a queued mark to the rejected list, where it waits to be read by a
 * person. Rejections are never dropped automatically — losing the notice would
 * be the same as losing the mark quietly, which is what this exists to prevent.
 */
export function reject(
  state: QueueState,
  id: string,
  personLabel: string,
  rejectedAt: string
): QueueState {
  const item = state.pending.find((q) => q.id === id);
  if (!item) return state;

  return {
    pending: state.pending.filter((q) => q.id !== id),
    rejected: [
      ...state.rejected,
      {
        id: item.id,
        input: item.input,
        queuedAt: item.queuedAt,
        rejectedAt,
        personLabel,
      },
    ],
  };
}

/** Records a failed attempt that is worth retrying — the network, usually. */
export function noteAttempt(state: QueueState, id: string, error: string): QueueState {
  return {
    ...state,
    pending: state.pending.map((q) =>
      q.id === id ? { ...q, attempts: q.attempts + 1, lastError: error } : q
    ),
  };
}

/** Clears a rejection once the supervisor has seen it. */
export const dismissRejection = (state: QueueState, id: string): QueueState => ({
  ...state,
  rejected: state.rejected.filter((r) => r.id !== id),
});

/**
 * Whether an error is worth retrying.
 *
 * A PostgrestError carries a `code`: the database was reached and said no, so
 * retrying will say no again. Anything without one is a failure to reach it at
 * all — the stockroom case — and belongs in the queue.
 */
export function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true;
  const code = (error as { code?: unknown }).code;
  return typeof code !== 'string' || code.length === 0;
}

/** Marks still waiting, oldest first — the order they should be replayed in. */
export const drainOrder = (state: QueueState): QueuedMark[] =>
  [...state.pending].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
