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

type ReturnsState = {
  records: ReturnRecord[];
  addReturn: (input: {
    branchId: string;
    outlet: string;
    billNo: string;
    billDate: string;
    reason: ReturnReason;
    remark: string;
    supplier: string;
    receivedOn: string;
  }) => string;
  /** Segregation is the point the route is decided, so it sets both at once. */
  segregate: (id: string, disposition: Disposition, on: string) => void;
  recordStage: (id: string, stage: Stage, on: string) => void;
  undoStage: (id: string, stage: Stage) => void;
};

export const useReturns = create<ReturnsState>((set) => ({
  records: SEED_RETURNS,

  addReturn: (input) => {
    const id = nextReturnId(useReturns.getState().records);
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
    }));
    return id;
  },

  segregate: (id, disposition, on) =>
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id
          ? { ...r, disposition, events: { ...r.events, segregated: r.events.segregated ?? on } }
          : r
      ),
    })),

  recordStage: (id, stage, on) =>
    set((s) => ({
      records: s.records.map((r) =>
        r.id === id ? { ...r, events: { ...r.events, [stage]: on } } : r
      ),
    })),

  undoStage: (id, stage) =>
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== id) return r;
        const events = { ...r.events };
        delete events[stage];
        // Clearing the segregation also clears the route it chose.
        return stage === 'segregated' ? { ...r, disposition: null, events } : { ...r, events };
      }),
    })),
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
