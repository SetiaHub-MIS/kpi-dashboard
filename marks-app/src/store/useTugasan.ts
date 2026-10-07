import { create } from 'zustand';
import {
  TUGASAN_ITEMS,
  TUGASAN_SEED_ENTRIES,
  TUGASAN_SEED_SCOPE,
  TUGASAN_SEED_SIGNOFF,
  tugasanKey,
} from '@/data/tugasan';
import { AUTOSAVE_MS, createUnsaved, dateReady } from '@/data/tugasanAutosave';
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
  /** Payroll number of whoever ticked the first item that week; cleared with the week's last tick. */
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
 * are typed, so the keystrokes stay local and are written a moment after
 * typing stops, or at once by `commitEntry` when the box or its row goes
 * away (data/tugasanAutosave.ts).
 *
 * Each write sends only what it changes: a tick its tick, a note its note and
 * date, the checker's stamp only the stamp. A phone holding an older copy of
 * the row — open on two devices, or ticked before the app finished loading —
 * can then never undo a tick, a remark or a signature written elsewhere.
 * Without Supabase (demo mode) everything stays in memory, as it always did.
 */
type TugasanState = {
  entriesByMonth: EntriesByMonth;
  signOffByMonth: SignOffByMonth;

  /** Replaces the seed with rows read from Postgres. */
  hydrate: (snapshot: TugasanSnapshot) => void;

  /**
   * Flip a tick. The week's sign-off is opened by whoever ticks first, and
   * cleared when the week's last tick comes off: a tick tried and taken back
   * is not a week filled.
   */
  toggle: (
    scope: string,
    itemKey: string,
    weekIdx: number,
    today: string,
    byId: string | null
  ) => Promise<WriteResult>;
  setNote: (scope: string, itemKey: string, weekIdx: number, note: string) => void;
  setTarikh: (scope: string, itemKey: string, weekIdx: number, tarikh: string) => void;
  /**
   * Write the boxes typed in (note, date), if any, and nothing else. Refuses a
   * date that is not one — unless `quiet`, the autosave, which leaves a
   * half-typed date for the person to finish — but still writes a note typed
   * beside it.
   */
  commitEntry: (
    scope: string,
    itemKey: string,
    weekIdx: number,
    opts?: { quiet?: boolean }
  ) => Promise<WriteResult>;
  /** DIPERIKSA OLEH: the caller confirms the week under their own number. */
  stampChecked: (scope: string, weekIdx: number, byId: string) => Promise<WriteResult>;
};

/** The fields of an entry a write changes; any left out keep what the table has. */
type EntryFields = { done?: boolean; note?: string | null; inspectedOn?: string | null };
type SignOffFields = { filledBy?: string | null; checkedBy?: string | null; signedOn?: string | null };

const persistEntry = async (
  scope: string,
  itemKey: string,
  weekIdx: number,
  fields: EntryFields
): Promise<WriteResult> => {
  if (!isSupabaseConfigured) return { ok: true };
  const parts = scopeParts(scope);
  if (!parts) return { ok: false, message: 'Pilih cawangan dahulu.' };
  return upsertTugasanCheck({ branchId: parts.branchId, period: parts.period, weekNo: weekIdx + 1, itemKey, ...fields });
};

const persistSignOff = async (
  scope: string,
  weekIdx: number,
  fields: SignOffFields
): Promise<WriteResult> => {
  if (!isSupabaseConfigured) return { ok: true };
  const parts = scopeParts(scope);
  if (!parts) return { ok: false, message: 'Pilih cawangan dahulu.' };
  return upsertTugasanSignoff({ branchId: parts.branchId, period: parts.period, weekNo: weekIdx + 1, ...fields });
};

/** What is typed in an entry, as the table holds it. */
const typedNote = (entry: TugasanEntry) => entry.note.trim() || null;

/** The entry's row, across outlets and months. */
const rowId = (scope: string, itemKey: string, weekIdx: number) => `${scope}|${tugasanKey(itemKey, weekIdx)}`;

/**
 * Notes and dates typed but not yet written, each box on its own — a save
 * sends only the box that was typed in — and the row's autosave timer.
 */
type Box = 'note' | 'tarikh';
const unsaved = createUnsaved();
const boxId = (row: string, box: Box) => `${row}|${box}`;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

const cancelAutosave = (row: string) => {
  const timer = timers.get(row);
  if (timer) clearTimeout(timer);
  timers.delete(row);
};

/** Something was typed in one box of the row: write it once typing stops. */
const typed = (scope: string, itemKey: string, weekIdx: number, box: Box) => {
  const row = rowId(scope, itemKey, weekIdx);
  unsaved.edit(boxId(row, box));
  cancelAutosave(row);
  timers.set(
    row,
    setTimeout(() => {
      timers.delete(row);
      void useTugasan.getState().commitEntry(scope, itemKey, weekIdx, { quiet: true });
    }, AUTOSAVE_MS)
  );
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
    const stamped = done && !cur.tarikh;
    const nextEntry: TugasanEntry = { ...cur, done, tarikh: stamped ? today : cur.tarikh };

    // The tick carries only what this phone has to add: whatever is typed in
    // the row and not yet written, and the date it stamps. It never resends a
    // remark or a date it has merely loaded.
    const row = rowId(scope, itemKey, weekIdx);
    const noteVersion = unsaved.current(boxId(row, 'note'));
    const dateVersion = unsaved.current(boxId(row, 'tarikh'));
    const fields: EntryFields = { done };
    if (noteVersion !== undefined) fields.note = typedNote(nextEntry);
    if (stamped || (dateVersion !== undefined && dateReady(nextEntry.tarikh))) {
      fields.inspectedOn = shortToIso(nextEntry.tarikh);
    }

    // Whoever ticks first opens the week. Taking the week's last tick off
    // closes it again, checker and date included.
    const curSignOff = s.signOffByMonth[scope]?.[weekIdx] ?? emptySignOff;
    const othersTicked = TUGASAN_ITEMS.some(
      (it) => it.key !== itemKey && (s.entriesByMonth[scope]?.[tugasanKey(it.key, weekIdx)]?.done ?? false)
    );
    let nextSignOff = curSignOff;
    let signOff: SignOffFields | null = null;
    if (done && !curSignOff.filledBy) {
      nextSignOff = { ...curSignOff, filledBy: byId, tarikh: curSignOff.tarikh || today };
      signOff = { filledBy: byId, signedOn: shortToIso(nextSignOff.tarikh) };
    } else if (!done && !othersTicked && (curSignOff.filledBy || curSignOff.checkedBy || curSignOff.tarikh)) {
      nextSignOff = emptySignOff;
      signOff = { filledBy: null, checkedBy: null, signedOn: null };
    }

    const wrote = await persistEntry(scope, itemKey, weekIdx, fields);
    if (!wrote.ok) return wrote;
    // A date still being typed was not sent: it stays unsaved.
    if (noteVersion !== undefined) unsaved.saved(boxId(row, 'note'), noteVersion);
    if (dateVersion !== undefined && fields.inspectedOn !== undefined) unsaved.saved(boxId(row, 'tarikh'), dateVersion);
    if (signOff) {
      const signed = await persistSignOff(scope, weekIdx, signOff);
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

  setNote: (scope, itemKey, weekIdx, note) => {
    set((s) => {
      const key = tugasanKey(itemKey, weekIdx);
      const scopeEntries = s.entriesByMonth[scope] ?? {};
      return {
        entriesByMonth: {
          ...s.entriesByMonth,
          [scope]: { ...scopeEntries, [key]: { ...(scopeEntries[key] ?? emptyEntry), note } },
        },
      };
    });
    typed(scope, itemKey, weekIdx, 'note');
  },

  setTarikh: (scope, itemKey, weekIdx, tarikh) => {
    set((s) => {
      const key = tugasanKey(itemKey, weekIdx);
      const scopeEntries = s.entriesByMonth[scope] ?? {};
      return {
        entriesByMonth: {
          ...s.entriesByMonth,
          [scope]: { ...scopeEntries, [key]: { ...(scopeEntries[key] ?? emptyEntry), tarikh } },
        },
      };
    });
    typed(scope, itemKey, weekIdx, 'tarikh');
  },

  commitEntry: async (scope, itemKey, weekIdx, opts) => {
    const row = rowId(scope, itemKey, weekIdx);
    cancelAutosave(row);
    const noteVersion = unsaved.current(boxId(row, 'note'));
    const dateVersion = unsaved.current(boxId(row, 'tarikh'));
    // Nothing typed since the last write: opening and closing a row writes nothing.
    if (noteVersion === undefined && dateVersion === undefined) return { ok: true };
    const entry = get().entriesByMonth[scope]?.[tugasanKey(itemKey, weekIdx)] ?? emptyEntry;
    const dateWaits = dateVersion !== undefined && !dateReady(entry.tarikh);
    const refused: WriteResult = { ok: false, message: 'Tarikh seperti 18/9/2026.' };

    // Only the boxes typed in: the tick is the checkbox's to change, and a box
    // not touched keeps whatever was written from elsewhere. A half-typed date
    // waits; a note typed beside it does not.
    const fields: EntryFields = {};
    if (noteVersion !== undefined) fields.note = typedNote(entry);
    if (dateVersion !== undefined && !dateWaits) fields.inspectedOn = shortToIso(entry.tarikh);
    if (fields.note === undefined && fields.inspectedOn === undefined) {
      return opts?.quiet ? { ok: true } : refused;
    }
    const wrote = await persistEntry(scope, itemKey, weekIdx, fields);
    if (!wrote.ok) return wrote;
    if (fields.note !== undefined) unsaved.saved(boxId(row, 'note'), noteVersion!);
    if (fields.inspectedOn !== undefined) unsaved.saved(boxId(row, 'tarikh'), dateVersion!);
    return dateWaits && !opts?.quiet ? refused : wrote;
  },

  stampChecked: async (scope, weekIdx, byId) => {
    const cur = get().signOffByMonth[scope]?.[weekIdx] ?? emptySignOff;
    const next: WeekSignOff = { ...cur, checkedBy: byId };
    const wrote = await persistSignOff(scope, weekIdx, { checkedBy: byId });
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
