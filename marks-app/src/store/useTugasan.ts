import { create } from 'zustand';
import {
  TUGASAN_ITEMS,
  TUGASAN_SEED_ENTRIES,
  TUGASAN_SEED_SCOPE,
  TUGASAN_SEED_SIGNOFF,
  tugasanKey,
} from '@/data/tugasan';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  TugasanSnapshot,
  WriteResult,
  scopeParts,
  shortToIso,
  upsertTugasanCheck,
  upsertTugasanSignoff,
} from '@/lib/tugasan';

export type TugasanEntry = {
  done: boolean;
  note: string;
  /** D/M/YYYY as typed; validated when committed. */
  tarikh: string;
};

const emptyEntry: TugasanEntry = { done: false, note: '', tarikh: '' };

export type WeekSignOff = {
  /** Payroll number of whoever ticked the first item that week. */
  filledBy: string | null;
  /** Payroll number of whoever confirmed the week — DIPERIKSA OLEH. */
  checkedBy: string | null;
  tarikh: string;
};

const emptySignOff: WeekSignOff = { filledBy: null, checkedBy: null, tarikh: '' };

/** scope -> `${itemKey}-${weekIdx}` -> entry */
type EntriesByMonth = Record<string, Record<string, TugasanEntry>>;
/** scope -> weekIdx -> sign-off. DIISIKAN OLEH covers both duties for that week. */
type SignOffByMonth = Record<string, Record<number, WeekSignOff>>;

/**
 * Every change is written to Postgres before the screen changes, the same
 * way the directory works: a refusal is shown rather than a tick that comes
 * back unticked on the next reload. Notes and dates are the exception — they
 * are typed, so the keystrokes stay local and `commitEntry` writes on blur.
 * Without Supabase (demo mode) everything stays in memory, as it always did.
 */
type TugasanState = {
  entriesByMonth: EntriesByMonth;
  signOffByMonth: SignOffByMonth;

  /** Replaces the seed with rows read from Postgres. */
  hydrate: (snapshot: TugasanSnapshot) => void;

  /** Flip a tick. The week's sign-off is opened by whoever ticks first. */
  toggle: (
    scope: string,
    itemKey: string,
    weekIdx: number,
    today: string,
    byId: string | null
  ) => Promise<WriteResult>;
  setNote: (scope: string, itemKey: string, weekIdx: number, note: string) => void;
  setTarikh: (scope: string, itemKey: string, weekIdx: number, tarikh: string) => void;
  /** Write the entry as it stands (note, date). Refuses a date that is not one. */
  commitEntry: (scope: string, itemKey: string, weekIdx: number) => Promise<WriteResult>;
  /** DIPERIKSA OLEH: the caller confirms the week under their own number. */
  stampChecked: (scope: string, weekIdx: number, byId: string) => Promise<WriteResult>;
};

const persistEntry = async (
  scope: string,
  itemKey: string,
  weekIdx: number,
  entry: TugasanEntry
): Promise<WriteResult> => {
  if (!isSupabaseConfigured) return { ok: true };
  const parts = scopeParts(scope);
  if (!parts) return { ok: false, message: 'Pilih cawangan dahulu.' };
  return upsertTugasanCheck({
    branchId: parts.branchId,
    period: parts.period,
    weekNo: weekIdx + 1,
    itemKey,
    done: entry.done,
    note: entry.note.trim() || null,
    inspectedOn: shortToIso(entry.tarikh),
  });
};

const persistSignOff = async (
  scope: string,
  weekIdx: number,
  so: WeekSignOff
): Promise<WriteResult> => {
  if (!isSupabaseConfigured) return { ok: true };
  const parts = scopeParts(scope);
  if (!parts) return { ok: false, message: 'Pilih cawangan dahulu.' };
  return upsertTugasanSignoff({
    branchId: parts.branchId,
    period: parts.period,
    weekNo: weekIdx + 1,
    filledBy: so.filledBy,
    checkedBy: so.checkedBy,
    signedOn: shortToIso(so.tarikh),
  });
};

export const useTugasan = create<TugasanState>((set, get) => ({
  entriesByMonth: { [TUGASAN_SEED_SCOPE]: TUGASAN_SEED_ENTRIES },
  signOffByMonth: { [TUGASAN_SEED_SCOPE]: TUGASAN_SEED_SIGNOFF },

  hydrate: (snapshot) => set({ entriesByMonth: snapshot.entries, signOffByMonth: snapshot.signoffs }),

  toggle: async (scope, itemKey, weekIdx, today, byId) => {
    const s = get();
    const key = tugasanKey(itemKey, weekIdx);
    const cur = s.entriesByMonth[scope]?.[key] ?? emptyEntry;
    const done = !cur.done;
    const nextEntry: TugasanEntry = {
      ...cur,
      done,
      tarikh: done && !cur.tarikh ? today : cur.tarikh,
    };

    const curSignOff = s.signOffByMonth[scope]?.[weekIdx] ?? emptySignOff;
    const nextSignOff: WeekSignOff =
      done && !curSignOff.filledBy
        ? { ...curSignOff, filledBy: byId, tarikh: curSignOff.tarikh || today }
        : curSignOff;

    const wrote = await persistEntry(scope, itemKey, weekIdx, nextEntry);
    if (!wrote.ok) return wrote;
    if (nextSignOff !== curSignOff) {
      const signed = await persistSignOff(scope, weekIdx, nextSignOff);
      if (!signed.ok) return signed;
    }

    set((st) => ({
      entriesByMonth: {
        ...st.entriesByMonth,
        [scope]: { ...(st.entriesByMonth[scope] ?? {}), [key]: nextEntry },
      },
      signOffByMonth: {
        ...st.signOffByMonth,
        [scope]: { ...(st.signOffByMonth[scope] ?? {}), [weekIdx]: nextSignOff },
      },
    }));
    return { ok: true };
  },

  setNote: (scope, itemKey, weekIdx, note) =>
    set((s) => {
      const key = tugasanKey(itemKey, weekIdx);
      const scopeEntries = s.entriesByMonth[scope] ?? {};
      return {
        entriesByMonth: {
          ...s.entriesByMonth,
          [scope]: { ...scopeEntries, [key]: { ...(scopeEntries[key] ?? emptyEntry), note } },
        },
      };
    }),

  setTarikh: (scope, itemKey, weekIdx, tarikh) =>
    set((s) => {
      const key = tugasanKey(itemKey, weekIdx);
      const scopeEntries = s.entriesByMonth[scope] ?? {};
      return {
        entriesByMonth: {
          ...s.entriesByMonth,
          [scope]: { ...scopeEntries, [key]: { ...(scopeEntries[key] ?? emptyEntry), tarikh } },
        },
      };
    }),

  commitEntry: async (scope, itemKey, weekIdx) => {
    const entry = get().entriesByMonth[scope]?.[tugasanKey(itemKey, weekIdx)] ?? emptyEntry;
    if (entry.tarikh.trim() && !shortToIso(entry.tarikh)) {
      return { ok: false, message: 'Tarikh seperti 18/9/2026.' };
    }
    return persistEntry(scope, itemKey, weekIdx, entry);
  },

  stampChecked: async (scope, weekIdx, byId) => {
    const cur = get().signOffByMonth[scope]?.[weekIdx] ?? emptySignOff;
    const next: WeekSignOff = { ...cur, checkedBy: byId };
    const wrote = await persistSignOff(scope, weekIdx, next);
    if (!wrote.ok) return wrote;
    set((s) => ({
      signOffByMonth: {
        ...s.signOffByMonth,
        [scope]: { ...(s.signOffByMonth[scope] ?? {}), [weekIdx]: next },
      },
    }));
    return { ok: true };
  },
}));

export function tugasanEntry(
  entriesByMonth: EntriesByMonth,
  scope: string,
  itemKey: string,
  weekIdx: number
): TugasanEntry {
  return entriesByMonth[scope]?.[tugasanKey(itemKey, weekIdx)] ?? emptyEntry;
}

export function tugasanSignOff(
  signOffByMonth: SignOffByMonth,
  scope: string,
  weekIdx: number
): WeekSignOff {
  return signOffByMonth[scope]?.[weekIdx] ?? emptySignOff;
}

export function tugasanDoneCount(
  entriesByMonth: EntriesByMonth,
  scope: string,
  weekIdx: number
): number {
  return TUGASAN_ITEMS.filter((it) => tugasanEntry(entriesByMonth, scope, it.key, weekIdx).done)
    .length;
}
