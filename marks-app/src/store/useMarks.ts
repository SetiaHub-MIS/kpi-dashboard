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
import { VERIFIED } from '@/data/crew';
import { Role, User } from '@/data/users';

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
  draft: Draft;

  prevMonth: () => void;
  nextMonth: () => void;
  startMarking: (personId: string, formKey: FormKey) => void;
  toggleKat: (no: number) => void;
  setScore: (key: string, value: number) => void;
  fillKategori: (katNo: number) => void;
  pickNoteChip: (chip: { key: string; text: string }) => void;
  setNoteText: (text: string) => void;
  submitDraft: () => void;
  verify: (key: string) => void;
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

  submitDraft: () =>
    set((s) => {
      const { personId, noteText } = s.draft;
      const t = draftTotals(s);
      if (!personId || !t.complete) return s;
      const note = noteText.trim();
      return {
        submitted: { ...s.submitted, [personId]: t.pct },
        submittedNotes: note
          ? { ...s.submittedNotes, [`${personId}-${ACTIVE_WEEK}`]: note }
          : s.submittedNotes,
        draft: emptyDraft,
      };
    }),

  verify: (key) => set((s) => ({ verified: { ...s.verified, [key]: true } })),

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

export function isVerified(
  key: string,
  verified: Record<string, boolean>
): boolean {
  return !!(VERIFIED[key] || verified[key]);
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
