/** Today, as the rest of the app fixes it. Dates are ISO so ageing is arithmetic. */
export const TODAY_ISO = '2026-09-08';

export type ReturnReason = 'damage' | 'expired';

export const REASON_LABEL: Record<ReturnReason, string> = {
  damage: 'Rosak',
  expired: 'Luput',
};

/** Where the goods end up once segregated. */
export type Disposition = 'supplier' | 'discard';

export const DISPOSITION_LABEL: Record<Disposition, string> = {
  supplier: 'Pulang ke pembekal',
  discard: 'Buang',
};

export type Stage =
  | 'received'
  | 'segregated'
  | 'supplier_called'
  | 'picked_up'
  | 'discarded'
  | 'adjusted';

export const STAGE_LABEL: Record<Stage, string> = {
  received: 'Terima bil pulangan',
  segregated: 'Asing & tentukan tindakan',
  supplier_called: 'Hubungi pembekal',
  picked_up: 'Pembekal ambil barang',
  discarded: 'Barang dibuang',
  adjusted: 'Pelarasan stok',
};

export type StageOwner = 'store' | 'clerk';

/** Which role is expected to record each stage. */
export const STAGE_OWNER: Record<Stage, StageOwner> = {
  received: 'store',
  segregated: 'store',
  supplier_called: 'clerk',
  picked_up: 'clerk',
  discarded: 'store',
  adjusted: 'store',
};

/**
 * Which stages this account may stamp. Only the two store roles act on returns;
 * everyone else (admin, manager) reads the record without being able to advance it.
 */
export function ownerForRole(role: string | undefined): StageOwner | null {
  if (role === 'clerk') return 'clerk';
  if (role === 'store') return 'store';
  return null;
}

export type ReturnRecord = {
  id: string;
  branchId: string;
  /** Which outlet sent the goods back to the store. */
  outlet: string;
  billNo: string;
  billDate: string;
  reason: ReturnReason;
  remark: string;
  supplier: string;
  /** Chosen at segregation; null until then. */
  disposition: Disposition | null;
  /** Stage -> ISO date it was recorded. */
  events: Partial<Record<Stage, string>>;
};

/**
 * The stages a record passes through. Everything runs through segregation,
 * then splits by disposition, and every route ends at the stock adjustment
 * that clears it.
 */
export function stagesFor(disposition: Disposition | null): Stage[] {
  if (disposition === 'supplier') {
    return ['received', 'segregated', 'supplier_called', 'picked_up', 'adjusted'];
  }
  if (disposition === 'discard') {
    return ['received', 'segregated', 'discarded', 'adjusted'];
  }
  return ['received', 'segregated'];
}

/** The first stage not yet recorded, or null once the record is cleared. */
export function nextStage(record: ReturnRecord): Stage | null {
  return stagesFor(record.disposition).find((s) => !record.events[s]) ?? null;
}

export const isCleared = (record: ReturnRecord) => !!record.events.adjusted;

export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);

/**
 * Receive-to-clear turnaround. Still-open records are aged against today, so
 * the number keeps climbing until the stock adjustment lands.
 */
export function turnaroundDays(record: ReturnRecord, today = TODAY_ISO): number {
  const start = record.events.received ?? record.billDate;
  return daysBetween(start, record.events.adjusted ?? today);
}

/** Days spent between two recorded stages, or null if either has not happened. */
export function gapDays(record: ReturnRecord, from: Stage, to: Stage): number | null {
  const a = record.events[from];
  const b = record.events[to];
  return a && b ? daysBetween(a, b) : null;
}

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
};

/** Ageing bands for an open record — drives the colour on the list. */
export function ageBand(days: number): 'ok' | 'warn' | 'late' {
  if (days <= 3) return 'ok';
  if (days <= 7) return 'warn';
  return 'late';
}

/** Ageing buckets for open records, used by the admin returns report. */
export const AGE_BUCKETS: { label: string; max: number }[] = [
  { label: '≤ 3 hari', max: 3 },
  { label: '4–7 hari', max: 7 },
  { label: '8–14 hari', max: 14 },
  { label: '> 14 hari', max: Number.POSITIVE_INFINITY },
];

export function bucketOf(days: number): string {
  return (AGE_BUCKETS.find((b) => days <= b.max) ?? AGE_BUCKETS[AGE_BUCKETS.length - 1]).label;
}

export type Transition = { from: Stage; to: Stage; avg: number; n: number };

/**
 * Average days spent on each hop of the chain, across every record that has
 * both ends stamped. Shows where returns actually stall.
 */
export function transitionStats(records: ReturnRecord[]): Transition[] {
  const acc = new Map<string, { from: Stage; to: Stage; total: number; n: number }>();
  records.forEach((r) => {
    const chain = stagesFor(r.disposition);
    for (let i = 1; i < chain.length; i++) {
      const from = chain[i - 1];
      const to = chain[i];
      const d = gapDays(r, from, to);
      if (d == null) continue;
      const key = `${from}>${to}`;
      const cur = acc.get(key) ?? { from, to, total: 0, n: 0 };
      cur.total += d;
      cur.n += 1;
      acc.set(key, cur);
    }
  });
  return [...acc.values()].map((x) => ({
    from: x.from,
    to: x.to,
    avg: Math.round(x.total / x.n),
    n: x.n,
  }));
}

export const SEED_RETURNS: ReturnRecord[] = [
  {
    id: 'PR0001',
    branchId: 'MCG',
    outlet: 'Kedai Machang',
    billNo: 'BR-8842',
    billDate: '2026-08-24',
    reason: 'damage',
    remark: 'Kotak biskut penyek masa hantar.',
    supplier: 'Munchy Food Industries',
    disposition: 'supplier',
    events: {
      received: '2026-08-24',
      segregated: '2026-08-25',
      supplier_called: '2026-08-26',
      picked_up: '2026-09-02',
      adjusted: '2026-09-03',
    },
  },
  {
    id: 'PR0002',
    branchId: 'MCG',
    outlet: 'Kedai Machang',
    billNo: 'BR-8907',
    billDate: '2026-09-01',
    reason: 'expired',
    remark: 'Roti dan susu segar tamat tempoh.',
    supplier: 'Gardenia Bakeries',
    disposition: 'discard',
    events: {
      received: '2026-09-01',
      segregated: '2026-09-02',
      discarded: '2026-09-04',
    },
  },
  {
    id: 'PR0003',
    branchId: 'MCG',
    outlet: 'Kedai Machang',
    billNo: 'BR-8931',
    billDate: '2026-09-05',
    reason: 'damage',
    remark: 'Tin susu kemek, 6 unit.',
    supplier: 'Dutch Lady Milk',
    disposition: 'supplier',
    events: {
      received: '2026-09-05',
      segregated: '2026-09-06',
    },
  },
  {
    id: 'PR0004',
    branchId: 'MCG',
    outlet: 'Kedai Machang',
    billNo: 'BR-8944',
    billDate: '2026-09-07',
    reason: 'expired',
    remark: 'Sos cili tamat tempoh 2 kotak.',
    supplier: 'Life Food Industries',
    disposition: null,
    events: {
      received: '2026-09-07',
    },
  },
  {
    id: 'PR0101',
    branchId: 'KBR',
    outlet: 'Kedai Kota Bharu',
    billNo: 'BR-2210',
    billDate: '2026-09-03',
    reason: 'damage',
    remark: 'Beg beras koyak.',
    supplier: 'Padiberas Nasional',
    disposition: 'supplier',
    events: {
      received: '2026-09-03',
      segregated: '2026-09-04',
      supplier_called: '2026-09-04',
    },
  },
];

export function nextReturnId(records: ReturnRecord[]): string {
  const highest = records
    .map((r) => Number.parseInt(r.id.replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `PR${String(highest + 1).padStart(4, '0')}`;
}

export function newReturnBlocker(
  records: ReturnRecord[],
  billNo: string,
  billDate: string
): string | null {
  if (!billNo.trim()) return 'No. bil diperlukan.';
  if (!billDate.trim()) return 'Tarikh bil diperlukan.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate.trim())) return 'Tarikh mesti YYYY-MM-DD.';
  if (records.some((r) => r.billNo.toLowerCase() === billNo.trim().toLowerCase())) {
    return `Bil ${billNo.trim()} sudah direkod.`;
  }
  return null;
}
