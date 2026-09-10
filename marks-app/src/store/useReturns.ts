import { create } from 'zustand';
import {
  Disposition,
  ReturnReason,
  ReturnRecord,
  SEED_RETURNS,
  STAGE_OWNER,
  Stage,
  isCleared,
  nextReturnId,
  nextStage,
} from '@/data/returns';
import {
  User,
  branchesOf,
  isCentralStore,
  isCrossBranch,
  seesReturns,
} from '@/data/users';
import { isRetryable } from '@/data/queue';
import {
  ReturnIds,
  createReturn,
  setDisposition,
  stampStage,
  unstampStage,
} from '@/lib/returns';
import { isSupabaseConfigured } from '@/lib/supabase';

type ReturnsState = {
  records: ReturnRecord[];
  /** ref -> returns.id, so a stage can be written against the right row. */
  ids: ReturnIds;
  /** Set when a write was refused. Surfaced rather than swallowed. */
  saveError: string | null;
  /** Replaces the seed with rows read from Postgres. */
  hydrate: (records: ReturnRecord[], ids: ReturnIds) => void;
  clearSaveError: () => void;
  addReturn: (input: {
    branchId: string;
    outlet: string;
    billNo: string;
    billDate: string;
    reason: ReturnReason;
    remark: string;
    supplier: string;
    receivedOn: string;
    /** Payroll number of whoever logged it. */
    by?: string;
  }) => string;
  /** Segregation is the point the route is decided, so it sets both at once. */
  segregate: (id: string, disposition: Disposition, on: string, by?: string) => void;
  recordStage: (id: string, stage: Stage, on: string, by?: string) => void;
  undoStage: (id: string, stage: Stage) => void;
};

/**
 * Applies a write to Postgres behind the local one.
 *
 * The local change has already happened, so a failure here never takes it back
 * off the screen. Losing the connection is left silent — the person is holding
 * a bill and can carry on — while a refusal is surfaced, because that one will
 * not fix itself.
 *
 * Unlike marks there is no retry queue yet: a return is a chain of stamps and
 * replaying them out of order would be worse than asking someone to tap again.
 */
async function persist(work: () => Promise<void>, set: (v: { saveError: string }) => void) {
  try {
    await work();
  } catch (e: any) {
    if (!isRetryable(e)) {
      set({ saveError: e?.message ?? 'Tidak dapat disimpan.' });
    }
  }
}

export const useReturns = create<ReturnsState>((set, get) => ({
  records: SEED_RETURNS,
  ids: {},
  saveError: null,

  hydrate: (records, ids) => set({ records, ids }),
  clearSaveError: () => set({ saveError: null }),

  addReturn: (input) => {
    const id = nextReturnId(get().records);
    set((s) => ({
      records: [
        {
          id,
          branchId: input.branchId,
          outlet: input.outlet,
          billNo: input.billNo.trim(),
          billDate: input.billDate.trim(),
          reason: input.reason,
          remark: input.remark.trim(),
          supplier: input.supplier.trim(),
          disposition: null,
          events: { received: input.receivedOn },
        },
        ...s.records,
      ],
      saveError: null,
    }));

    if (isSupabaseConfigured && input.by) {
      void persist(async () => {
        const rowId = await createReturn({
          ref: id,
          branchId: input.branchId,
          billNo: input.billNo,
          billDate: input.billDate,
          reason: input.reason,
          remark: input.remark,
          supplier: input.supplier,
          receivedOn: input.receivedOn,
          createdBy: input.by!,
        });
        set((s) => ({ ids: { ...s.ids, [id]: rowId } }));
      }, set);
    }

    return id;
  },

  segregate: (id, disposition, on, by) => {
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id
          ? { ...r, disposition, events: { ...r.events, segregated: r.events.segregated ?? on } }
          : r
      ),
      saveError: null,
    }));

    const rowId = get().ids[id];
    if (isSupabaseConfigured && rowId != null && by) {
      void persist(async () => {
        await setDisposition(rowId, disposition);
        await stampStage(rowId, 'segregated', on, by);
      }, set);
    }
  },

  recordStage: (id, stage, on, by) => {
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id ? { ...r, events: { ...r.events, [stage]: on } } : r
      ),
      saveError: null,
    }));

    const rowId = get().ids[id];
    if (isSupabaseConfigured && rowId != null && by) {
      void persist(() => stampStage(rowId, stage, on, by), set);
    }
  },

  undoStage: (id, stage) => {
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== id) return r;
        const events = { ...r.events };
        delete events[stage];
        // Clearing the segregation also clears the route it chose.
        return stage === 'segregated' ? { ...r, disposition: null, events } : { ...r, events };
      }),
      saveError: null,
    }));

    const rowId = get().ids[id];
    if (isSupabaseConfigured && rowId != null) {
      void persist(async () => {
        await unstampStage(rowId, stage);
        if (stage === 'segregated') await setDisposition(rowId, null);
      }, set);
    }
  },
}));

export const returnsOfBranch = (records: ReturnRecord[], branchId: string | null) =>
  branchId == null ? records : records.filter((r) => r.branchId === branchId);

/**
 * The returns an account may act on. A return's branch_id is the outlet the
 * goods came *from*, so the HQ stor team — who are posted to HQ and handle all
 * of them — cannot be scoped by their own branch or they would see nothing.
 * Head office sees every outlet, an Area Manager the ones assigned to them, and
 * the cross-branch manager and admin none at all.
 *
 * Mirrors app_can_see_branch_returns() and app_can_see_returns() in RLS.
 */
export const returnsVisibleTo = (
  records: ReturnRecord[],
  user: User | undefined
): ReturnRecord[] => {
  if (!user || !seesReturns(user.role)) return [];
  if (isCentralStore(user.role) || isCrossBranch(user.role)) return records;
  const mine = branchesOf(user);
  return records.filter((r) => mine.includes(r.branchId));
};

export const openReturns = (records: ReturnRecord[]) => records.filter((r) => !isCleared(r));

export const clearedReturns = (records: ReturnRecord[]) => records.filter(isCleared);

/** Records whose next step belongs to the given role. */
export const awaitingRole = (records: ReturnRecord[], owner: 'store' | 'clerk') =>
  openReturns(records).filter((r) => {
    const stage = nextStage(r);
    return stage != null && STAGE_OWNER[stage] === owner;
  });
