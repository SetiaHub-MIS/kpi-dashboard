/**
 * Head-office rollups. Everything here is per outlet or across all of them —
 * never per person. Head office judges outlets, not individuals; the named
 * marking sheets belong to the SV/AS and the Area Manager who own them.
 *
 * The stor side is conditional throughout. A cross-branch `manager` is blind to
 * returns and to the 17-perkara checklist, so their report carries nulls where
 * the other head-office roles get numbers — nulls rather than zeroes, so the
 * screen can say "not in remit" instead of implying an empty stor.
 */
import { Branch, branchLabel, isHq } from '@/data/branches';
import {
  AGE_LIMIT_DAYS,
  ReturnRecord,
  TODAY_ISO,
  ageingStatus,
  isCleared,
  submissionStats,
  turnaroundDays,
} from '@/data/returns';
import { User, seesStoreOps } from '@/data/users';

/** A mark lookup, so this module never has to know about the marks store. */
export type MarkOf = (user: User, weekIdx: number) => number | null;

export type CohortStat = {
  people: number;
  /** Average across recorded marks only; 0 when nothing has been marked. */
  avg: number;
  marked: number;
  gaps: number;
  cellTotal: number;
};

export type ReturnStat = {
  received: number;
  submissionPct: number;
  late: number;
  missing: number;
  open: number;
  /** Past the two-month ceiling, cleared or not. */
  aged: number;
  /** Past the week allowed to clear a breach. */
  overdue: number;
  oldestDays: number;
};

export type OutletReport = {
  /** null for the all-outlets row. */
  branchId: string | null;
  label: string;
  kedai: CohortStat;
  /** null when the viewer's role does not reach the stor side. */
  stor: CohortStat | null;
  returns: ReturnStat | null;
};

export function cohortStat(people: User[], markOf: MarkOf): CohortStat {
  let sum = 0;
  let marked = 0;
  let gaps = 0;

  people.forEach((p) =>
    p.w.forEach((_, i) => {
      const v = markOf(p, i);
      if (v == null) gaps += 1;
      else {
        sum += v;
        marked += 1;
      }
    })
  );

  return {
    people: people.length,
    avg: marked ? Math.round(sum / marked) : 0,
    marked,
    gaps,
    cellTotal: people.length * 4,
  };
}

export function returnStat(records: ReturnRecord[], today = TODAY_ISO): ReturnStat {
  const submission = submissionStats(records);
  const open = records.filter((r) => !isCleared(r));
  const statuses = records.map((r) => ageingStatus(r, today));

  return {
    received: submission.received,
    submissionPct: submission.pct,
    late: submission.late,
    missing: submission.missing,
    open: open.length,
    aged: statuses.filter((s) => s === 'breach' || s === 'overdue').length,
    overdue: statuses.filter((s) => s === 'overdue').length,
    oldestDays: open.reduce((n, r) => Math.max(n, turnaroundDays(r, today)), 0),
  };
}

/**
 * One row of the report. Pass branchId null to roll every outlet into a single
 * line — the averages are recomputed from the underlying marks rather than
 * averaged across outlets, so a big outlet weighs more than a small one.
 */
export function outletReport(input: {
  branchId: string | null;
  label: string;
  users: User[];
  records: ReturnRecord[];
  markOf: MarkOf;
  seesStore: boolean;
  /** False for a single outlet: the stor crew is central, so an outlet has none. */
  includeStor?: boolean;
}): OutletReport {
  const { branchId, label, users, records, markOf, seesStore, includeStor = true } = input;
  const here = <T extends { branchId: string | null }>(rows: T[]) =>
    branchId == null ? rows : rows.filter((r) => r.branchId === branchId);

  const staff = here(users).filter((u) => u.active);

  return {
    branchId,
    label,
    kedai: cohortStat(staff.filter((u) => u.role === 'staff'), markOf),
    stor:
      seesStore && includeStor
        ? cohortStat(staff.filter((u) => u.role === 'store'), markOf)
        : null,
    returns: seesStore ? returnStat(here(records)) : null,
  };
}

/**
 * The whole report.
 *
 * HQ is not an outlet: it is the central store, and the only place pekerja stor
 * are posted. So the stor figures appear once, on the total, and never as a
 * column on a kedai that has no stor crew of its own.
 *
 * Only outlets with people or returns are listed. With 38 kedai and a pilot
 * running at two of them, listing the other 36 as empty rows would bury the
 * ones carrying data; the count comes back as `quiet` so the screen can say so
 * in a line instead.
 */
export function hqReport(input: {
  branches: Branch[];
  users: User[];
  records: ReturnRecord[];
  markOf: MarkOf;
  viewerRole: User['role'];
}): { total: OutletReport; outlets: OutletReport[]; quiet: number } {
  const { branches, users, records, markOf, viewerRole } = input;
  const seesStore = seesStoreOps(viewerRole);
  const active = branches.filter((b) => b.active && !isHq(b.id));

  const rows = active.map((b) =>
    outletReport({
      branchId: b.id,
      label: branchLabel(branches, b.id),
      users,
      records,
      markOf,
      seesStore,
      includeStor: false,
    })
  );

  const live = rows.filter(
    (o) => o.kedai.people > 0 || (o.returns?.received ?? 0) > 0
  );

  return {
    total: outletReport({
      branchId: null,
      label: 'Semua cawangan',
      users,
      records,
      markOf,
      seesStore,
    }),
    outlets: live,
    quiet: rows.length - live.length,
  };
}

/** Outlets ranked worst-first on the kedai average, ignoring unmarked outlets. */
export function weakestFirst(outlets: OutletReport[]): OutletReport[] {
  return [...outlets]
    .filter((o) => o.kedai.marked > 0)
    .sort((a, b) => a.kedai.avg - b.kedai.avg);
}

/** How a percentage reads against the pass mark — drives the colour bands. */
export const AGE_CEILING_DAYS = AGE_LIMIT_DAYS;
