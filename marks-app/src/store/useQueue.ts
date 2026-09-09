import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  QueueState,
  QueuedMark,
  dismissRejection,
  drainOrder,
  emptyQueue,
  enqueue,
  isRetryable,
  noteAttempt,
  reject,
  settle,
} from '@/data/queue';
import { SubmitMarkInput, submitMark } from '@/lib/marks';
import { isSupabaseConfigured } from '@/lib/supabase';

const KEY = 'checklist.markQueue.v1';

/**
 * Marks entered without a signal, and what became of them.
 *
 * Persisted, because the phone this matters on is one that was closed in a
 * stockroom and reopened in the office an hour later. Draining is attempted at
 * boot, after every submit, and on demand — there is no network-state listener,
 * so a failed drain simply leaves the queue for the next attempt rather than
 * waiting for an event that may not come.
 */
type QueueStore = QueueState & {
  loaded: boolean;
  draining: boolean;
  load: () => Promise<void>;
  add: (input: SubmitMarkInput) => Promise<void>;
  /** Replays everything pending. Safe to call when there is nothing to do. */
  drain: (nameOf: (userId: string) => string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
};

const persist = async (state: QueueState) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // A device that cannot write its own storage will lose the queue on close.
    // Nothing useful to do here; the mark is still on screen.
  }
};

export const useQueue = create<QueueStore>((set, get) => ({
  ...emptyQueue,
  loaded: false,
  draining: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const saved: QueueState = raw ? JSON.parse(raw) : emptyQueue;
      set({ ...emptyQueue, ...saved, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  add: async (input) => {
    const item: QueuedMark = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      input,
      queuedAt: new Date().toISOString(),
      attempts: 0,
    };
    const next = enqueue({ pending: get().pending, rejected: get().rejected }, item);
    set(next);
    await persist(next);
  },

  drain: async (nameOf) => {
    if (!isSupabaseConfigured || get().draining) return;
    const queue = { pending: get().pending, rejected: get().rejected };
    if (queue.pending.length === 0) return;

    set({ draining: true });
    let state = queue;

    for (const item of drainOrder(queue)) {
      try {
        // only-if-absent: the ruling is first write wins, so a mark that landed
        // while this one waited keeps the week.
        const result = await submitMark(item.input, 'only-if-absent');
        state = result.ok
          ? settle(state, item.id)
          : reject(state, item.id, nameOf(item.input.userId), new Date().toISOString());
      } catch (e: any) {
        if (isRetryable(e)) {
          // Still no network. Leave it queued and stop — the rest will fail the
          // same way, and hammering a dead connection helps nobody.
          state = noteAttempt(state, item.id, e?.message ?? 'Tiada sambungan');
          break;
        }
        // The database refused it. Retrying would be refused identically, so it
        // is surfaced the same way a conflict is.
        state = reject(state, item.id, nameOf(item.input.userId), new Date().toISOString());
      }
    }

    set({ ...state, draining: false });
    await persist(state);
  },

  dismiss: async (id) => {
    const next = dismissRejection({ pending: get().pending, rejected: get().rejected }, id);
    set(next);
    await persist(next);
  },
}));
