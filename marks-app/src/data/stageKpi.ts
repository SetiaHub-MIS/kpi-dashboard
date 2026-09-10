import type { ReturnRecord, Stage, StageOwner } from '@/data/returns';

/**
 * How the stor roles are measured: on the returns they actually move, not on a
 * checklist.
 *
 * That is the ruling for kerani stor — they have no form of their own, and
 * inventing one would have meant grading them on work nobody described. The
 * data to measure them by was already there: every return carries the date each
 * stage was stamped, and every stage has an owner.
 *
 * Deliberately owner-agnostic. Pekerja stor own five stages and kerani stor two,
 * and both deserve the same reading of them — so this takes the owner as an
 * argument rather than hardcoding the clerk.
 */

/** The stages each role is responsible for stamping. Mirrors STAGE_OWNER. */
const STAGE_OWNERS: Record<Stage, StageOwner> = {
  received: 'store',
  submitted_to_clerk: 'store',
  segregated: 'store',
  supplier_called: 'clerk',
  picked_up: 'clerk',
  discarded: 'store',
  adjusted: 'store',
};

/** The route a return takes, which depends on where the goods end up. */
function chain(disposition: ReturnRecord['disposition']): Stage[] {
  if (disposition === 'supplier') {
    return ['received', 'submitted_to_clerk', 'segregated', 'supplier_called', 'picked_up', 'adjusted'];
  }
  if (disposition === 'discard') {
    return ['received', 'submitted_to_clerk', 'segregated', 'discarded', 'adjusted'];
  }
  return ['received', 'submitted_to_clerk', 'segregated'];
}

const nextStage = (r: ReturnRecord): Stage | null =>
  chain(r.disposition).find((s) => !r.events[s]) ?? null;

const days = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export type StageHop = {
  from: Stage;
  to: Stage;
  avgDays: number;
  n: number;
  /**
   * True when the average is negative — the later stage was stamped before the
   * earlier one. That is not a fast hop, it is a bill whose dates were entered
   * out of order, and it is surfaced rather than clamped to zero because a
   * clamp would quietly turn bad data into a flattering number.
   */
  outOfOrder: boolean;
};

export type StageKpi = {
  /** Bills whose next step is this role's, right now. */
  waiting: number;
  /** Of those, already past the two-month ceiling — the ones that bite. */
  waitingAged: number;
  /** Oldest bill sitting on one of their stages, in days since receipt. */
  oldestWaitingDays: number;
  /** Stages they stamped, across every bill. The volume behind the averages. */
  stamped: number;
  /** Average days on each hop they own, slowest first. */
  hops: StageHop[];
  /**
   * Days from a bill arriving on their desk to them clearing it, averaged.
   * Null when they have never completed one — which is not zero.
   */
  avgHandoverDays: number | null;
};

/**
 * Everything measurable about one role's part of the returns chain.
 *
 * `ageLimitDays` is passed in rather than imported so this file stays free of
 * runtime dependencies and can be tested directly.
 */
export function stageKpi(
  records: ReturnRecord[],
  owner: StageOwner,
  today: string,
  ageLimitDays = 60
): StageKpi {
  const mine = (s: Stage) => STAGE_OWNERS[s] === owner;

  const waitingRecords = records.filter((r) => {
    const next = nextStage(r);
    return next != null && mine(next);
  });

  const ageOf = (r: ReturnRecord) =>
    days(r.events.received ?? r.billDate, r.events.adjusted ?? today);

  // Hops where the *destination* is one of theirs: the wait they are answerable
  // for is the gap between the previous stage landing and them acting on it.
  const acc = new Map<string, { from: Stage; to: Stage; total: number; n: number }>();
  let stamped = 0;
  const handovers: number[] = [];

  records.forEach((r) => {
    const route = chain(r.disposition);
    route.forEach((stage, i) => {
      if (!r.events[stage]) return;
      if (mine(stage)) stamped += 1;
      if (i === 0 || !mine(stage)) return;

      const prev = route[i - 1];
      const from = r.events[prev];
      const to = r.events[stage];
      if (!from || !to) return;

      const gap = days(from, to);
      handovers.push(gap);
      const key = `${prev}>${stage}`;
      const cur = acc.get(key) ?? { from: prev, to: stage, total: 0, n: 0 };
      cur.total += gap;
      cur.n += 1;
      acc.set(key, cur);
    });
  });

  return {
    waiting: waitingRecords.length,
    waitingAged: waitingRecords.filter((r) => ageOf(r) > ageLimitDays).length,
    oldestWaitingDays: waitingRecords.reduce((n, r) => Math.max(n, ageOf(r)), 0),
    stamped,
    hops: [...acc.values()]
      .map((h) => {
        const avgDays = Math.round(h.total / h.n);
        return { from: h.from, to: h.to, avgDays, n: h.n, outOfOrder: avgDays < 0 };
      })
      .sort((a, b) => b.avgDays - a.avgDays),
    avgHandoverDays: handovers.length
      ? Math.round(handovers.reduce((a, b) => a + b, 0) / handovers.length)
      : null,
  };
}
