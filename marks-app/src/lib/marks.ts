import { FormKey } from '@/data/checklist';
import { Period, currentPeriod, monthShort, samePeriod, weekRangeLabel } from '@/data/period';
import { supabase } from '@/lib/supabase';

/**
 * Marks, per-perkara lines and the manager's verification, against Postgres.
 *
 * The app scores against its own copy of the form and keys each answer
 * `${kategoriNo}-${lineIndex}`; the database keys them by `checklist_lines.id`.
 * Resolving one to the other needs the reference tables, which are read once
 * and cached — they change only when the form itself does.
 *
 * Every write here goes through RLS. A supervisor writing outside their branch
 * is refused by the database, not by a check in this file.
 */

/** `${formKey}:${kategoriNo}:${lineIndex}` -> checklist_lines.id */
type LineIndex = Map<string, number>;

const lineRef = (formKey: string, katNo: number, lineIdx: number) =>
  `${formKey}:${katNo}:${lineIdx}`;

let cachedLines: LineIndex | null = null;

/**
 * The form as the database numbers it. `checklist_categories.position` is the
 * kategori number and `checklist_lines.position` is 1-based, where the app
 * indexes its lines from zero — the off-by-one is converted here so no caller
 * has to remember it.
 */
export async function fetchLineIndex(force = false): Promise<LineIndex> {
  if (cachedLines && !force) return cachedLines;

  const { data, error } = await supabase
    .from('checklist_lines')
    .select('id, position, checklist_categories!inner(position, form_key)');

  if (error) throw error;

  const index: LineIndex = new Map();
  (data ?? []).forEach((row: any) => {
    const cat = Array.isArray(row.checklist_categories)
      ? row.checklist_categories[0]
      : row.checklist_categories;
    if (!cat) return;
    index.set(lineRef(cat.form_key, cat.position, row.position - 1), row.id);
  });

  cachedLines = index;
  return index;
}

export type SubmitMarkInput = {
  userId: string;
  branchId: string;
  formKey: FormKey;
  period: Period;
  /** 1-4, as the form numbers its columns. */
  weekNo: number;
  /** `${kategoriNo}-${lineIndex}` -> score. */
  scores: Record<string, number>;
  maxScore: number;
  note?: string;
  scoredBy: string;
};

/**
 * Writes one week's mark and its per-perkara detail.
 *
 * `marks` is unique on (user, year, month, week), so re-marking a week updates
 * that row rather than adding a second one — the workbook allowed two
 * contradictory figures for the same week and this is where that is prevented.
 * The lines are replaced wholesale for the same reason: a partial overwrite
 * would leave scores from the previous attempt mixed in with the new ones.
 */
export type SubmitResult =
  | { ok: true; markId: number }
  /** The week already holds a mark that this write did not create. */
  | { ok: false; reason: 'conflict' };

/**
 * `replace` is the interactive path: the supervisor is deliberately re-marking
 * a week and their own correction should stand.
 *
 * `only-if-absent` is how a queued mark replays. Time has passed since it was
 * entered, so a mark already sitting in that week came from somewhere else and
 * wins — first write wins, and the queued one is handed back as a conflict for
 * the supervisor to be told about rather than being silently overwritten.
 */
export type SubmitMode = 'replace' | 'only-if-absent';

const UNIQUE_VIOLATION = '23505';

export async function submitMark(
  input: SubmitMarkInput,
  mode: SubmitMode = 'replace'
): Promise<SubmitResult> {
  const total = Object.values(input.scores).reduce((a, b) => a + b, 0);

  const row = {
    user_id: input.userId,
    branch_id: input.branchId,
    form_key: input.formKey,
    period_year: input.period.year,
    period_month: input.period.month,
    week_no: input.weekNo,
    total_score: total,
    max_score: input.maxScore,
    note: input.note?.trim() || null,
    scored_by: input.scoredBy,
  };

  // The unique index on (user, year, month, week) is what decides a race, not a
  // read-then-write here: two phones syncing at once would both see an empty
  // week and both think they were first.
  const { data: mark, error: markErr } =
    mode === 'replace'
      ? await supabase
          .from('marks')
          .upsert(row, { onConflict: 'user_id,period_year,period_month,week_no' })
          .select('id')
          .single()
      : await supabase.from('marks').insert(row).select('id').single();

  if (markErr) {
    if (mode === 'only-if-absent' && markErr.code === UNIQUE_VIOLATION) {
      return { ok: false, reason: 'conflict' };
    }
    throw markErr;
  }

  const index = await fetchLineIndex();
  const lines = Object.entries(input.scores).flatMap(([key, score]) => {
    const [katNo, lineIdx] = key.split('-').map(Number);
    const lineId = index.get(lineRef(input.formKey, katNo, lineIdx));
    // A line the database does not know is dropped rather than guessed at. It
    // means the app's copy of the form has drifted from the reference tables,
    // which is worth noticing rather than papering over.
    return lineId == null ? [] : [{ mark_id: mark.id, line_id: lineId, score }];
  });

  const dropped = Object.keys(input.scores).length - lines.length;
  if (dropped > 0) {
    console.warn(`${dropped} perkara had no matching checklist_lines row; not saved.`);
  }

  await supabase.from('mark_lines').delete().eq('mark_id', mark.id);
  if (lines.length > 0) {
    const { error: lineErr } = await supabase.from('mark_lines').insert(lines);
    if (lineErr) throw lineErr;
  }

  return { ok: true, markId: mark.id };
}

/**
 * The Area Manager's pass over a mark. `adjustedTo` is set only when they
 * override the total rather than agreeing with it, which is why it is optional
 * and why its absence is not the same as agreeing to zero.
 */
export async function verifyMark(
  markId: number,
  verifiedBy: string,
  adjustedTo?: number
): Promise<void> {
  const { error } = await supabase.from('mark_verifications').upsert(
    {
      mark_id: markId,
      verified_by: verifiedBy,
      adjusted_to: adjustedTo ?? null,
    },
    { onConflict: 'mark_id' }
  );
  if (error) throw error;
}

export type MarkRow = {
  id: number;
  userId: string;
  branchId: string;
  formKey: string;
  weekNo: number;
  pct: number;
  note: string | null;
  maxScore: number;
  verified: boolean;
  /** Set only when the Area Manager overrode the SV/AS total. */
  adjustedTo: number | null;
};

/** Every mark in a period, with whether the manager has signed it off. */
export async function fetchMarks(period: Period): Promise<MarkRow[]> {
  const { data, error } = await supabase
    .from('marks')
    .select(
      'id, user_id, branch_id, form_key, week_no, pct, note, max_score, mark_verifications(mark_id, adjusted_to)'
    )
    .eq('period_year', period.year)
    .eq('period_month', period.month);

  if (error) throw error;

  return (data ?? []).map((m: any) => {
    const ver = Array.isArray(m.mark_verifications) ? m.mark_verifications[0] : m.mark_verifications;
    return {
      id: m.id,
      userId: m.user_id,
      branchId: m.branch_id,
      formKey: m.form_key,
      weekNo: m.week_no,
      pct: m.pct,
      note: m.note,
      maxScore: m.max_score,
      verified: ver != null,
      adjustedTo: ver?.adjusted_to ?? null,
    };
  });
}

/**
 * Average score per kategori for each person, as a percentage of the scale.
 *
 * This is what the directory could not fill in before: it needs mark_lines
 * joined back through categories, which is two hops past the marks table.
 * Returned keyed by user, each an array indexed by kategori position.
 */
export async function fetchPerkaraAverages(
  period: Period,
  scaleMax: number
): Promise<Record<string, number[]>> {
  const { data, error } = await supabase
    .from('mark_lines')
    .select(
      'score, marks!inner(user_id, period_year, period_month), checklist_lines!inner(checklist_categories!inner(position))'
    )
    .eq('marks.period_year', period.year)
    .eq('marks.period_month', period.month);

  if (error) throw error;

  // user -> kategori position -> running total
  const acc = new Map<string, Map<number, { sum: number; n: number }>>();

  (data ?? []).forEach((row: any) => {
    const mark = Array.isArray(row.marks) ? row.marks[0] : row.marks;
    const line = Array.isArray(row.checklist_lines) ? row.checklist_lines[0] : row.checklist_lines;
    const cat = Array.isArray(line?.checklist_categories)
      ? line.checklist_categories[0]
      : line?.checklist_categories;
    if (!mark || !cat) return;

    const byKat = acc.get(mark.user_id) ?? new Map();
    const cur = byKat.get(cat.position) ?? { sum: 0, n: 0 };
    cur.sum += row.score;
    cur.n += 1;
    byKat.set(cat.position, cur);
    acc.set(mark.user_id, byKat);
  });

  const out: Record<string, number[]> = {};
  acc.forEach((byKat, userId) => {
    const highest = Math.max(...byKat.keys());
    const arr: number[] = new Array(highest).fill(0);
    byKat.forEach((v, pos) => {
      // Scores are 1..scaleMax; the screens read a percentage.
      arr[pos - 1] = Math.round((v.sum / v.n / scaleMax) * 100);
    });
    out[userId] = arr;
  });

  return out;
}

export type StaffWeek = {
  markId: number;
  period: Period;
  weekNo: number;
  /** "Minggu 2 · 8–14 Sep" this month, "Ogos · Minggu 4" before that. */
  label: string;
  pct: number;
  total: number;
  maxScore: number;
  note: string;
  /** Percentage per kategori, indexed by position. Empty for imported marks. */
  perkara: number[];
  verified: boolean;
  scoredBy: string | null;
  /** Set only when the Area Manager overrode the SV/AS total, as a percentage. */
  adjustedPct: number | null;
};

/**
 * One person's own marks, newest first — the self-view.
 *
 * Read under the person's own session: RLS lets someone see their branch, so a
 * pekerja gets their own history without any filter written here. The lines are
 * fetched in a second query rather than a nested embed, because `marks` has two
 * foreign keys into `users` and the ambiguity is not worth the round trip saved.
 */
export async function fetchMyWeeks(
  userId: string,
  scaleMax: number,
  limit = 8
): Promise<StaffWeek[]> {
  const { data: marks, error } = await supabase
    .from('marks')
    .select('id, period_year, period_month, week_no, total_score, max_score, pct, note, scored_by, mark_verifications(mark_id, adjusted_to)')
    .eq('user_id', userId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .order('week_no', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!marks || marks.length === 0) return [];

  const ids = marks.map((m: any) => m.id);
  const { data: lines, error: lineErr } = await supabase
    .from('mark_lines')
    .select('mark_id, score, checklist_lines!inner(checklist_categories!inner(position))')
    .in('mark_id', ids);

  if (lineErr) throw lineErr;

  // mark -> kategori position -> running average
  const byMark = new Map<number, Map<number, { sum: number; n: number }>>();
  (lines ?? []).forEach((row: any) => {
    const line = Array.isArray(row.checklist_lines) ? row.checklist_lines[0] : row.checklist_lines;
    const cat = Array.isArray(line?.checklist_categories)
      ? line.checklist_categories[0]
      : line?.checklist_categories;
    if (!cat) return;
    const forMark = byMark.get(row.mark_id) ?? new Map();
    const cur = forMark.get(cat.position) ?? { sum: 0, n: 0 };
    cur.sum += row.score;
    cur.n += 1;
    forMark.set(cat.position, cur);
    byMark.set(row.mark_id, forMark);
  });

  const now = currentPeriod();

  return marks.map((m: any) => {
    const period = { year: m.period_year, month: m.period_month };
    const forMark = byMark.get(m.id);
    const perkara: number[] = [];
    if (forMark) {
      const highest = Math.max(...forMark.keys());
      for (let pos = 1; pos <= highest; pos++) {
        const v = forMark.get(pos);
        perkara.push(v ? Math.round((v.sum / v.n / scaleMax) * 100) : 0);
      }
    }

    const ver = Array.isArray(m.mark_verifications) ? m.mark_verifications[0] : m.mark_verifications;

    return {
      markId: m.id,
      period,
      weekNo: m.week_no,
      label: samePeriod(period, now)
        ? `Minggu ${m.week_no} · ${weekRangeLabel(period, m.week_no)}`
        : `${monthShort(period)} · Minggu ${m.week_no}`,
      pct: m.pct,
      total: m.total_score,
      maxScore: m.max_score,
      note: m.note ?? '',
      perkara,
      verified: ver != null,
      scoredBy: m.scored_by,
      adjustedPct:
        ver?.adjusted_to != null ? Math.round((ver.adjusted_to / m.max_score) * 100) : null,
    };
  });
}
