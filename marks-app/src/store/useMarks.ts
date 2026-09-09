import { create } from 'zustand';
import {
  ACTIVE_WEEK,
  FORMS,
  FormKey,
  Kategori,
  MONTHS,
  countLines,
  lineKey,
} from '@/data/checklist';
import { Period, currentPeriod } from '@/data/period';
import { Role, User } from '@/data/users';
import { isRetryable } from '@/data/queue';
import { submitMark, verifyMark } from '@/lib/marks';
import { useQueue } from '@/store/useQueue';
import { isSupabaseConfigured } from '@/lib/supabase';

/** Kedai and stor are scored on different forms, so every total is form-relative. */
export const formKeyForRole = (role: Role): FormKey =>
  role === 'store' ? 'stor' : 'kedai';

export const formForRole = (role: Role): Kategori[] => FORMS[formKeyForRole(role)];

type Draft = {
  personId: string | null;
  /** Which checklist this draft is being scored against. */
  formKey: FormKey;
  scores: Record<string, number>;
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

  monthIdx: number;
  /** Marks submitted in-app this session: personId -> % for ACTIVE_WEEK. */
  submitted: Record<string, number>;
  /** Catatan saved alongside those marks, keyed `${personId}-${ACTIVE_WEEK}`. */
  submittedNotes: Record<string, string>;
  /** Manager sign-off, keyed `${personId}-${weekIndex}`. */
  verified: Record<string, boolean>;
  /** marks.id for a person's week, once known. Verification needs the row id. */
  markIds: Record<string, number>;
  /** Set when a write to Postgres failed, so the screen can say so. */
  saveError: string | null;
  draft: Draft;

  prevMonth: () => void;
  nextMonth: () => void;
  startMarking: (personId: string, formKey: FormKey) => void;
  toggleKat: (no: number) => void;
  setScore: (key: string, value: number) => void;
  fillKategori: (katNo: number) => void;
  pickNoteChip: (chip: { key: string; text: string }) => void;
  setNoteText: (text: string) => void;
  submitDraft: (ctx?: SaveContext) => Promise<void>;
  verify: (key: string, ctx?: VerifyContext) => Promise<void>;
  noteMarkIds: (ids: Record<string, number>) => void;
  noteVerified: (flags: Record<string, boolean>) => void;
  noteWeekNotes: (notes: Record<string, string>) => void;
  setRule: (rule: Partial<Pick<MarksState, 'passThreshold' | 'scaleMax' | 'verifyByManager'>>) => void;
};

export const useMarks = create<MarksState>((set, get) => ({
  passThreshold: 80,
  scaleMax: 5,
  verifyByManager: true,

  monthIdx: MONTHS.length - 1,
  submitted: {},
  submittedNotes: {},
  verified: {},
  markIds: {},
  saveError: null,
  draft: emptyDraft,

  prevMonth: () => set((s) => ({ monthIdx: Math.max(0, s.monthIdx - 1) })),
  nextMonth: () => set((s) => ({ monthIdx: Math.min(MONTHS.length - 1, s.monthIdx + 1) })),

  startMarking: (personId, formKey) => set({ draft: { ...emptyDraft, personId, formKey } }),

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
      const scores = { ...s.draft.scores };
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
   * screen and sets saveError; Sprint 2's queue is what will retry it.
   */
  submitDraft: async (ctx) => {
    const s = get();
    const { personId, noteText, formKey } = s.draft;
    const t = draftTotals(s);
    if (!personId || !t.complete) return;

    const note = noteText.trim();
    set({
      submitted: { ...s.submitted, [personId]: t.pct },
      submittedNotes: note
        ? { ...s.submittedNotes, [`${personId}-${ACTIVE_WEEK}`]: note }
        : s.submittedNotes,
      saveError: null,
      draft: emptyDraft,
    });

    if (!isSupabaseConfigured || !ctx) return;

    const input = {
      userId: personId,
      branchId: ctx.branchId,
      formKey,
      period: ctx.period ?? currentPeriod(),
      weekNo: ACTIVE_WEEK + 1,
      scores: s.draft.scores,
      maxScore: t.max,
      note,
      scoredBy: ctx.scoredBy,
    };

    try {
      const result = await submitMark(input);
      if (result.ok) {
        set((cur) => ({
          markIds: { ...cur.markIds, [`${personId}-${ACTIVE_WEEK}`]: result.markId },
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
    set((s) => ({ verified: { ...s.verified, [key]: true }, saveError: null }));

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

  setRule: (rule) => set(rule),
}));

export type Totals = {
  total: number;
  filled: number;
  complete: boolean;
  max: number;
  pct: number;
};

export function draftTotals(s: Pick<MarksState, 'draft' | 'scaleMax'>): Totals {
  const keys = Object.keys(s.draft.scores);
  const total = keys.reduce((n, k) => n + s.draft.scores[k], 0);
  const lineCount = countLines(FORMS[s.draft.formKey]);
  const max = lineCount * s.scaleMax;
  return {
    total,
    filled: keys.length,
    complete: keys.length === lineCount,
    max,
    pct: keys.length ? Math.round((total / max) * 100) : 0,
  };
}

/**
 * A person's mark for a week, with any mark submitted in-app taking precedence
 * over the seeded workbook value.
 */
export function weekMark(
  person: User,
  weekIdx: number,
  submitted: Record<string, number>
): number | null {
  if (weekIdx === ACTIVE_WEEK && submitted[person.id] != null) {
    return submitted[person.id];
  }
  return person.w[weekIdx];
}

/**
 * Whether the Area Manager has signed a mark off. Loaded from
 * `mark_verifications` at hydration and set optimistically when they sign one
 * off in-app, so the tick appears without waiting for a round trip.
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
