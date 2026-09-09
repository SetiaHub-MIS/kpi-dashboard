/**
 * Rule 4, the other half. The stock system has no API, so the only bridge
 * between it and this app is a CSV the vendor exports by hand. This module
 * parses that file and diffs it against our own returns, so a bill sitting in
 * one system and not the other is caught instead of being missed by eye.
 *
 * Written against a real export — "TRANSFER NOTE MASTER DATA
 * 2026-08-01_to_2026-08-31.csv", whose columns are LOCATION CODE, Date, Bill
 * Number, Bill Type, Total Bill Amount, Total Bill Selling Price. Column names
 * are still resolved by alias and overridable by hand, because one month's
 * export is not a contract.
 */
import type { ReturnRecord, ReturnReason } from './returns';

/** Vendor columns worth reading. Only the bill number is load-bearing. */
export type VendorField = 'billNo' | 'billDate' | 'branch' | 'billType' | 'supplier' | 'amount';

export const VENDOR_FIELDS: VendorField[] = [
  'billNo',
  'billDate',
  'branch',
  'billType',
  'supplier',
  'amount',
];

export const FIELD_LABEL: Record<VendorField, string> = {
  billNo: 'No. bil',
  billDate: 'Tarikh bil',
  branch: 'Kod lokasi',
  billType: 'Jenis bil',
  supplier: 'Pembekal',
  amount: 'Amaun',
};

/** Column index in the parsed table for each field, or null if unmapped. */
export type Mapping = Record<VendorField, number | null>;

export const EMPTY_MAPPING: Mapping = {
  billNo: null,
  billDate: null,
  branch: null,
  billType: null,
  supplier: null,
  amount: null,
};

/**
 * Header names worth recognising. The real export's own names come first in
 * each list; the rest are plausible variants, since the export is configurable
 * and only one month of it has been seen.
 */
const ALIASES: Record<VendorField, string[]> = {
  billNo: [
    'billnumber', 'nobil', 'bil', 'nobill', 'bill', 'billno', 'nodokumen',
    'docno', 'documentno', 'invoice', 'invoiceno', 'noinvois', 'invois',
    'transfernote', 'transfernoteno', 'reference', 'ref', 'rujukan',
  ],
  billDate: [
    'date', 'tarikh', 'tarikhbil', 'tarikhdokumen', 'billdate', 'docdate',
    'documentdate', 'invoicedate', 'posteddate', 'transferdate',
  ],
  branch: [
    'locationcode', 'location', 'lokasi', 'kodlokasi', 'branch', 'branchcode',
    'cawangan', 'kodcawangan', 'outlet', 'store', 'kedai',
  ],
  billType: [
    'billtype', 'jenisbil', 'type', 'jenis', 'transactiontype', 'returntype',
    'transfertype',
  ],
  supplier: ['pembekal', 'supplier', 'vendor', 'namapembekal', 'suppliername', 'vendorname'],
  amount: [
    'totalbillamount', 'billamount', 'amaun', 'jumlah', 'nilai', 'amount',
    'value', 'total', 'nettotal', 'grandtotal', 'totalbillsellingprice',
  ],
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Excel prefixes its exports with a byte-order mark; it is not data. */
const stripBom = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

/**
 * RFC 4180-ish. Handles quoted cells with embedded commas, doubled quotes and
 * newlines, plus CRLF and a leading BOM — all things Excel produces.
 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const src = stripBom(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Excel leaves a trailing empty line; a row of blanks is not a record.
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ''));
}

/** Comma, semicolon or tab, whichever appears most in the first line. */
export function sniffDelimiter(text: string): string {
  const line = stripBom(text).split(/\r?\n/)[0] ?? '';
  const counts = [',', ';', '\t'].map((d) => [d, line.split(d).length - 1] as const);
  const best = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : ',';
}

/**
 * Best guess at which column is which, by header name. An unrecognised header
 * leaves the field unmapped rather than guessing by position — a wrong silent
 * guess would read as a clean reconciliation.
 */
export function guessMapping(header: string[]): Mapping {
  const mapping: Mapping = { ...EMPTY_MAPPING };
  const taken = new Set<number>();

  VENDOR_FIELDS.forEach((field) => {
    const idx = header.findIndex((h, i) => !taken.has(i) && ALIASES[field].includes(slug(h)));
    if (idx >= 0) {
      mapping[field] = idx;
      taken.add(idx);
    }
  });

  return mapping;
}

/**
 * Bill numbers are typed by hand at both ends, so `BR-8842`, `br 8842` and
 * `BR8842` are the same bill. Compared on letters and digits only.
 */
export const normaliseBill = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const pad = (y: string, m: string, d: string): string | null => {
  const mm = Number(m);
  const dd = Number(d);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};

/**
 * The sample export writes `3/8/2026` for 3 August, so slashed dates are read
 * day-first. Returns ISO, or null when the shape is not recognised.
 */
export function parseLooseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return pad(iso[1], iso[2], iso[3]);

  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return pad(year, dmy[2], dmy[1]);
  }

  return null;
}

/**
 * The export's Bill Type onto our two reasons. `GOOD STOCK RETURN` maps to
 * neither — it is a return of saleable stock, which this app does not model —
 * so it comes back null and is surfaced rather than silently called damage.
 */
export function reasonFromBillType(billType: string): ReturnReason | null {
  const t = billType.toUpperCase();
  if (t.includes('EXPIR') || t.includes('LUPUT')) return 'expired';
  if (t.includes('DAMAGE') || t.includes('ROSAK')) return 'damage';
  return null;
}

export type VendorRow = {
  /** 1-based line in the pasted file, so a problem row can be found again. */
  line: number;
  billNo: string;
  key: string;
  billDate: string | null;
  billDateRaw: string;
  /** The export's location code, e.g. `DMC`. Blank when unmapped. */
  branch: string;
  billType: string;
  /** Bill type read as one of our reasons, or null when it is neither. */
  reason: ReturnReason | null;
  supplier: string;
  amount: string;
};

/** Turns the parsed table into vendor rows under the given column mapping. */
export function toVendorRows(table: string[][], mapping: Mapping, hasHeader = true): VendorRow[] {
  const body = hasHeader ? table.slice(1) : table;
  const at = (row: string[], field: VendorField) => {
    const i = mapping[field];
    return i == null ? '' : (row[i] ?? '').trim();
  };

  return body
    .map((row, n) => {
      const billNo = at(row, 'billNo');
      const billDateRaw = at(row, 'billDate');
      const billType = at(row, 'billType');
      return {
        line: n + (hasHeader ? 2 : 1),
        billNo,
        key: normaliseBill(billNo),
        billDate: parseLooseDate(billDateRaw),
        billDateRaw,
        branch: at(row, 'branch'),
        billType,
        reason: billType ? reasonFromBillType(billType) : null,
        supplier: at(row, 'supplier'),
        amount: at(row, 'amount'),
      };
    })
    .filter((r) => r.key !== '');
}

/**
 * The location codes present in a file, with how many rows each has. The
 * export is per-location and its codes (`DMC`) are not our branch ids (`MCG`),
 * so rather than inventing a mapping the screen shows these and lets the
 * person reconciling choose which belong to the branch in front of them.
 */
export function locationCounts(rows: VendorRow[]): { code: string; count: number }[] {
  const acc = new Map<string, number>();
  rows.forEach((r) => {
    if (!r.branch) return;
    acc.set(r.branch, (acc.get(r.branch) ?? 0) + 1);
  });
  return [...acc.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

export type FieldClash = 'billDate' | 'supplier' | 'reason';

export type Match = {
  record: ReturnRecord;
  row: VendorRow;
  /** Fields present on both sides that disagree. */
  clashes: FieldClash[];
};

export type Reconciliation = {
  /** Every bill found on both sides, clashes flagged. */
  matched: Match[];
  /** Matched pairs whose details disagree — a subset of `matched`. */
  mismatched: Match[];
  /** Recorded here, absent from the stock system's export. */
  appOnly: ReturnRecord[];
  /** In the stock system, never recorded here. */
  vendorOnly: VendorRow[];
  /** Bill numbers appearing more than once in the vendor file. */
  duplicates: string[];
  /** Vendor rows whose date column could not be read. */
  unparsedDates: VendorRow[];
  /** Vendor rows whose bill type is neither damage nor expired. */
  unknownTypes: VendorRow[];
};

/** Names are typed at both ends; compared on letters and digits only. */
const looseEq = (a: string, b: string) => slug(a) === slug(b);

/**
 * The diff itself. Matching is on the normalised bill number alone — it is the
 * one field both systems are guaranteed to hold — and everything else is
 * compared only to report disagreement, never to decide a match.
 */
export function reconcile(records: ReturnRecord[], rows: VendorRow[]): Reconciliation {
  const byKey = new Map<string, ReturnRecord>();
  records.forEach((r) => byKey.set(normaliseBill(r.billNo), r));

  const seen = new Map<string, number>();
  const matched: Match[] = [];
  const vendorOnly: VendorRow[] = [];
  const matchedKeys = new Set<string>();

  rows.forEach((row) => {
    const times = (seen.get(row.key) ?? 0) + 1;
    seen.set(row.key, times);
    // A bill listed twice is one bill; the repeat is reported as a duplicate.
    if (times > 1) return;

    const record = byKey.get(row.key);
    if (!record) {
      vendorOnly.push(row);
      return;
    }
    matchedKeys.add(row.key);

    const clashes: FieldClash[] = [];
    if (row.billDate && row.billDate !== record.billDate) clashes.push('billDate');
    if (row.supplier && record.supplier && !looseEq(row.supplier, record.supplier)) {
      clashes.push('supplier');
    }
    if (row.reason && row.reason !== record.reason) clashes.push('reason');
    matched.push({ record, row, clashes });
  });

  return {
    matched,
    mismatched: matched.filter((m) => m.clashes.length > 0),
    appOnly: records.filter((r) => !matchedKeys.has(normaliseBill(r.billNo))),
    vendorOnly,
    duplicates: [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k),
    unparsedDates: rows.filter((r) => r.billDateRaw !== '' && r.billDate == null),
    unknownTypes: rows.filter((r) => r.billType !== '' && r.reason == null),
  };
}

/** True once the mapping carries enough to run a diff at all. */
export const canReconcile = (m: Mapping) => m.billNo != null;
