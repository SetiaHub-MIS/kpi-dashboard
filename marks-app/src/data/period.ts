/**
 * The clock, and the months and weeks the checklist is scored against.
 *
 * This used to be three hardcoded strings and a frozen `TODAY = '8/9/2026'`,
 * which meant every ageing figure was wrong by however long it had been since
 * someone edited the constant. Everything here derives from the real date.
 *
 * Dates are handled in local time on purpose. A mark entered at 9pm in Kelantan
 * belongs to that day, not to the next one in UTC — and the whole app compares
 * plain YYYY-MM-DD strings, so a date that drifts a day is a mark filed in the
 * wrong week.
 */

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN',
  'JULAI', 'OGOS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Today as YYYY-MM-DD in the device's own timezone. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Today as the app writes it into a catatan: D/M/YYYY. */
export function todayShort(now: Date = new Date()): string {
  return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
}

export type Period = { year: number; month: number };

export const currentPeriod = (now: Date = new Date()): Period => ({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
});

export const periodOf = (iso: string): Period => ({
  year: Number(iso.slice(0, 4)),
  month: Number(iso.slice(5, 7)),
});

export const periodKey = (p: Period) => `${p.year}-${pad(p.month)}`;

export const periodLabel = (p: Period) => `${MONTH_NAMES[p.month - 1]} ${p.year}`;

export const samePeriod = (a: Period, b: Period) =>
  a.year === b.year && a.month === b.month;

/**
 * The months the switcher offers: `count` of them ending with the current one,
 * oldest first, so the last index is always now. Callers index into this the
 * way they used to index into the old MONTHS constant.
 */
export function recentPeriods(count = 6, now: Date = new Date()): Period[] {
  const out: Period[] = [];
  for (let back = count - 1; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

/**
 * Which of the four checklist weeks a date falls in, 1–4.
 *
 * The workbook gives every month exactly four columns regardless of length, so
 * days 22 onwards all belong to week 4. That is the form's own arithmetic, not
 * an ISO week number, and the app has to match the paper it replaces.
 */
export function weekOfMonth(iso: string): number {
  const day = Number(iso.slice(8, 10));
  return Math.min(4, Math.max(1, Math.ceil(day / 7)));
}

/** The same thing as a 0-based index into a four-slot week array. */
export const weekIndexOf = (iso: string) => weekOfMonth(iso) - 1;

/** Days between two ISO dates, positive when `to` is later. */
export const daysBetweenIso = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export const SHORT_MONTH = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];

/**
 * The days a checklist week covers, as the header reads them: "8–14 Sep".
 *
 * Week 4 runs to the end of the month rather than to day 28, because the form
 * has four columns and a 31-day month still has to fit in them.
 */
export function weekRangeLabel(p: Period, weekNo: number): string {
  const from = (weekNo - 1) * 7 + 1;
  const lastDay = new Date(p.year, p.month, 0).getDate();
  const to = weekNo >= 4 ? lastDay : Math.min(weekNo * 7, lastDay);
  return `${from}–${to} ${SHORT_MONTH[p.month - 1]}`;
}

/** "Ogos", for labelling a week that is not in the current month. */
export const monthShort = (p: Period) => SHORT_MONTH[p.month - 1];

const DAY_NAMES = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const FULL_MONTH = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
];

/** "Selasa, 8 September 2026" — the date as the self-view greets someone with. */
export function todayLongLabel(now: Date = new Date()): string {
  return `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${FULL_MONTH[now.getMonth()]} ${now.getFullYear()}`;
}
