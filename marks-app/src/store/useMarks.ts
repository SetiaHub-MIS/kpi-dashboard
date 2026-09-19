import { create } from 'zustand';
import {
  FORMS,
  FormKey,
  Kategori,
  MONTHS,
  PERIODS,
  countLines,
  currentWeekIdx,
  lineKey,
} from '@/data/checklist';
import { Period } from '@/data/period';
import { Answer, Totals, scoredOnly, totalsOf } from '@/data/scoring';
import { Role, User } from '@/data/users';
import { isRetryable } from '@/data/queue';
import { fetchMarkScores, submitMark, verifyMark } from '@/lib/marks';
import { useQueue } from '@/store/useQueue';
import { isSupabaseConfigured } from '@/lib/supabase';

/** Each marked role has its own form, so every total is form-relative. */
export const formKeyForRole = (role: Role): FormKey =>
  role === 'store' ? 'stor' : role === 'supervisor' ? 'sv' : 'kedai';

export const formForRole = (role: Role): Kategori[] => FORMS[formKeyForRole(role)];

/** The store's key for one person's week in the loaded month. */
export const weekKey = (personId: string, weekIdx: number) => `${personId}-${weekIdx}`;

type Draft = {
  personId: string | null;
  /** Which checklist this draft is being scored against. */
  formKey: FormKey;
  /** A line is a score, or 'na' where a line does not apply. */
  scores: Record<string, Answer>;
  /** Which quick-chip is active, if the catatan came from one. */
  noteChip: string | null;
  noteText: string;
  openKat: number | null;
};

const emptyDraft: Draft = {
  personId: null,
  formKey: 'kedai',
  scores: {},
  noteChip: null,
  noteText: '',
  openKat: 1,
};

/** What a save needs that the store does not know: who is marking, and where. */
export type SaveContext = {
  branchId: string;
  scoredBy: string;
  period?: Period;
  /** Resolves a payroll number to a name, for the rejection notice. */
  nameOf?: (userId: string) => string;
};

export type VerifyContext = {
  verifiedBy: string;
  /** Set only when the manager overrides the total rather than agreeing. */
  adjustedTo?: number;
};

type MarksState = {
  /** Peraturan — the scoring rules the kedai runs on. */
  passThreshold: number;
  scaleMax: number;
  verifyByManager: boolean;

  /** Which of PERIODS is loaded and being marked. Changing it reloads the marks. */
  monthIdx: number;
  /** Which of the four weeks marking lands in, 0-based. */
  weekIdx: number;
  /** A month's marks are on their way from Postgres. */
  periodLoading: boolean;
  /** Marks submitted in-app this session, keyed `${personId}-${weekIdx}`. */
  submitted: Record<string, number>;
  /** Catatan saved alongside those marks, same key. */
  submittedNotes: Record<string, string>;
  /** Manager sign-off, keyed `${personId}-${weekIdx}`. A signed-off week is locked. */
  verified: Record<string, boolean>;
  /** marks.id for a person's week, once known. Verification needs the row id. */
  markIds: Record<string, number>;
  /** The Area Manager's overriding percentage, same key. Absent = agreed with SV/AS. */
  adjusted: Record<string, number>;
  /** That mark's max_score, so an override can be validated against it. */
  markMax: Record<string, number>;
  /** Set when a write to Postgres failed, so the screen can say so. */
  saveError: string | null;
  draft: Draft;

  setMonth: (monthIdx: number) => void;
  setWeek: (weekIdx: number) => void;
  setPeriodLoading: (loading: boolean) => void;
  /** Drops everything that belongs to the loaded month, ahead of loading another. */
  clearPeriod: () => void;
  startMarking: (personId: string, formKey: FormKey) => void;
  toggleKat: (no: number) => void;
  setScore: (key: string, value: Answer) => void;
  fillKategori: (katNo: number) => void;
  pickNoteChip: (chip: { key: string; text: string }) => void;
  setNoteText: (text: string) => void;
  submitDraft: (ctx?: SaveContext) => Promise<void>;
  verify: (key: string, ctx?: VerifyContext) => Promise<void>;
  noteMarkIds: (ids: Record<string, number>) => void;
  noteVerified: (flags: Record<string, boolean>) => void;
  noteWeekNotes: (notes: Record<string, string>) => void;
  noteAdjusted: (adjusted: Record<string, number>) => void;
  noteMarkMax: (markMax: Record<string, number>) => void;
  clearSaveError: () => void;
  /** Drops everything loaded for the signed-in account. */
  reset: () => void;
  setRule: (rule: Partial<Pick<MarksState, 'passThreshold' | 'scaleMax' | 'verifyByManager'>>) => void;
};

const emptyPeriod = {
  submitted: {},
  submittedNotes: {},
  verified: {},
  markIds: {},
  adjusted: {},
  markMax: {},
};

export const useMarks = create<MarksState>((set, get) => ({
  passThreshold: 80,
  scaleMax: 5,
  verifyByManager: true,

  monthIdx: MONTHS.length - 1,
  weekIdx: currentWeekIdx(),
  periodLoading: false,
  ...emptyPeriod,
  saveError: null,
  draft: emptyDraft,

  setMonth: (monthIdx) =>
    set({ monthIdx: Math.max(0, Math.min(MONTHS.length - 1, monthIdx)) }),

  setWeek: (weekIdx) => set({ weekIdx: Math.max(0, Math.min(3, weekIdx)) }),

  setPeriodLoading: (periodLoading) => set({ periodLoading }),

  clearPeriod: () => set({ ...emptyPeriod, saveError: null }),

  /**
   * Opens a draft, and where the week already holds a mark, fills it in from
   * the lines behind that mark — a correction starts from what was scored,
   * not from a blank form. The lines arrive after the screen has opened; if
   * the supervisor has moved on to someone else by then they are dropped.
   */
  startMarking: (personId, formKey) => {
    const s = get();
    const key = weekKey(personId, s.weekIdx);
    set({ draft: { ...emptyDraft, personId, formKey, noteText: s.submittedNotes[key] ?? '' } });

    const markId = s.markIds[key];
    if (!isSupabaseConfigured || markId == null) return;
    void fetchMarkScores(markId, formKey)
      .then((scores) => {
        set((cur) =>
          cur.draft.personId === personId && Object.keys(cur.draft.scores).length === 0
            ? { draft: { ...cur.draft, scores } }
            : cur
        );
      })
      .catch(() => {
        // The form stays blank; the supervisor can still score it afresh.
      });
  },

  toggleKat: (no) =>
    set((s) => ({
      draft: { ...s.draft, openKat: s.draft.openKat === no ? null : no },
    })),

  setScore: (key, value) =>
    set((s) => ({
      draft: { ...s.draft, scores: { ...s.draft.scores, [key]: value } },
    })),

  fillKategori: (katNo) =>
    set((s) => {
      const form = FORMS[s.draft.formKey];
      const kat = form.find((k) => k.no === katNo);
      if (!kat) return s;
      const scores: Record<string, Answer> = { ...s.draft.scores };
      kat.lines.forEach((_, i) => {
        scores[lineKey(katNo, i)] = s.scaleMax - 1;
      });
      const next = form.find((k) => k.no > katNo);
      return { draft: { ...s.draft, scores, openKat: next ? next.no : null } };
    }),

  pickNoteChip: (chip) =>
    set((s) => {
      const clearing = s.draft.noteChip === chip.key;
      return {
        draft: {
          ...s.draft,
          noteChip: clearing ? null : chip.key,
          noteText: clearing ? '' : chip.text,
        },
      };
    }),

  setNoteText: (noteText) =>
    set((s) => ({ draft: { ...s.draft, noteText, noteChip: null } })),

  /**
   * Records the mark locally first, then writes it.
   *
   * The local write is not an optimisation — it is what lets a supervisor keep
   * marking when the stockroom has no signal. A failed write leaves the mark on
   * screen and sets saveError; the queue is what retries it.
   */
  submitDraft: async (ctx) => {
    const s = get();
    const { personId, noteText, formKey } = s.draft;
    const t = draftTotals(s);
    if (!personId || !t.canSubmit) return;
    const key = weekKey(personId, s.weekIdx);
    // The database refuses this too; refusing here keeps the screen honest
    // rather than showing a mark the server will never hold.
    if (s.verified[key]) return;

    const note = noteText.trim();
    set({
      submitted: { ...s.submitted, [key]: t.pct },
      submittedNotes: note
        ? { ...s.submittedNotes, [key]: note }
        : Object.fromEntries(Object.entries(s.submittedNotes).filter(([k]) => k !== key)),
      saveError: null,
      draft: emptyDraft,
    });

    if (!isSupabaseConfigured || !ctx) return;

    const input = {
      userId: personId,
      branchId: ctx.branchId,
      formKey,
      period: ctx.period ?? PERIODS[s.monthIdx],
      weekNo: s.weekIdx + 1,
      scores: scoredOnly(s.draft.scores),
      maxScore: t.max,
      note,
      scoredBy: ctx.scoredBy,
    };

    try {
      const result = await submitMark(input);
      if (result.ok) {
        set((cur) => ({
          markIds: { ...cur.markIds, [key]: result.markId },
          markMax: { ...cur.markMax, [key]: t.max },
        }));
      }
      // This write proved the network is back, so anything still queued from
      // earlier gets its chance now rather than waiting for the next restart.
      if (useQueue.getState().pending.length > 0) {
        void useQueue.getState().drain(ctx.nameOf ?? ((id) => id));
      }
    } catch (e: any) {
      if (isRetryable(e)) {
        // No signal. The mark is already on screen; queue it and carry on, which
        // is the whole point — a stockroom with no bars must not stop marking.
        await useQueue.getState().add(input);
      } else {
        set({ saveError: e?.message ?? 'Markah tidak dapat disimpan.' });
      }
    }
  },

  verify: async (key, ctx) => {
    set((s) => ({
      verified: { ...s.verified, [key]: true },
      adjusted:
        ctx?.adjustedTo != null && s.markMax[key]
          ? { ...s.adjusted, [key]: Math.round((ctx.adjustedTo / s.markMax[key]) * 100) }
          : s.adjusted,
      saveError: null,
    }));

    const markId = get().markIds[key];
    if (!isSupabaseConfigured || !ctx || markId == null) return;

    try {
      await verifyMark(markId, ctx.verifiedBy, ctx.adjustedTo);
    } catch (e: any) {
      set({ saveError: e?.message ?? 'Pengesahan tidak dapat disimpan.' });
    }
  },

  noteMarkIds: (ids) => set((s) => ({ markIds: { ...s.markIds, ...ids } })),

  noteVerified: (flags) => set((s) => ({ verified: { ...s.verified, ...flags } })),

  noteWeekNotes: (notes) =>
    set((s) => ({ submittedNotes: { ...notes, ...s.submittedNotes } })),

  noteAdjusted: (adjusted) => set((s) => ({ adjusted: { ...s.adjusted, ...adjusted } })),

  noteMarkMax: (markMax) => set((s) => ({ markMax: { ...s.markMax, ...markMax } })),

  clearSaveError: () => set({ saveError: null }),

  reset: () =>
    set({
      monthIdx: MONTHS.length - 1,
      weekIdx: currentWeekIdx(),
      periodLoading: false,
      ...emptyPeriod,
      saveError: null,
      draft: emptyDraft,
    }),

  setRule: (rule) => set(rule),
}));

/**
 * A week's total. The arithmetic lives in `@/data/scoring` so the blank-is-not-
 * zero rule can be tested without a store around it.
 */
export function draftTotals(s: Pick<MarksState, 'draft' | 'scaleMax'>): Totals {
  return totalsOf(s.draft.scores, countLines(FORMS[s.draft.formKey]), s.scaleMax);
}

/**
 * A person's mark for a week of the loaded month, with any mark submitted
 * in-app this session taking precedence over what was loaded.
 */
export function weekMark(
  person: User,
  weekIdx: number,
  submitted: Record<string, number>
): number | null {
  return submitted[weekKey(person.id, weekIdx)] ?? person.w[weekIdx];
}

/**
 * Whether the Area Manager has signed a mark off. Loaded from
 * `mark_verifications` at hydration and set optimistically when they sign one
 * off in-app, so the tick appears without waiting for a round trip. A signed-
 * off week can no longer be re-scored — the database refuses it too.
 */
export function isVerified(
  key: string,
  verified: Record<string, boolean>
): boolean {
  return !!verified[key];
}

export function monthStats(staff: User[], submitted: Record<string, number>) {
  let sum = 0;
  let n = 0;
  let gaps = 0;
  staff.forEach((p) =>
    p.w.forEach((_, i) => {
      const v = weekMark(p, i, submitted);
      if (v == null) gaps++;
      else {
        sum += v;
        n++;
      }
    })
  );
  return {
    avg: n ? Math.round(sum / n) : 0,
    marked: n,
    gaps,
    cellTotal: staff.length * 4,
  };
}

/**
 * Average per kategori for one form's cohort, ignoring people with no marks.
 * Only ever call this with people scored on the same form — kedai and stor
 * kategori are different, so averaging across them is meaningless.
 */
export function perkaraAverages(people: User[], form: Kategori[]): number[] {
  return form.map((_, i) => {
    const vals = people.map((p) => p.perkara[i] ?? 0).filter((v) => v > 0);
    return Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
  });
}
