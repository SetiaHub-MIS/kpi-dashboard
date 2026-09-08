import { create } from 'zustand';
import {
  TUGASAN_ITEMS,
  TUGASAN_SEED_ENTRIES,
  TUGASAN_SEED_SCOPE,
  TUGASAN_SEED_SIGNOFF,
  tugasanKey,
} from '@/data/tugasan';

export type TugasanEntry = {
  done: boolean;
  note: string;
  tarikh: string;
};

const emptyEntry: TugasanEntry = { done: false, note: '', tarikh: '' };

export type WeekSignOff = {
  diisikanOleh: string;
  diperiksaOleh: string;
  tarikh: string;
};

const emptySignOff: WeekSignOff = { diisikanOleh: '', diperiksaOleh: '', tarikh: '' };

/** scope -> `${itemKey}-${weekIdx}` -> entry */
type EntriesByMonth = Record<string, Record<string, TugasanEntry>>;
/** scope -> weekIdx -> sign-off. DIISIKAN OLEH covers both duties for that week. */
type SignOffByMonth = Record<string, Record<number, WeekSignOff>>;

type TugasanState = {
  entriesByMonth: EntriesByMonth;
  signOffByMonth: SignOffByMonth;

  toggle: (
    scope: string,
    itemKey: string,
    weekIdx: number,
    today: string,
    managerName: string
  ) => void;
  setNote: (scope: string, itemKey: string, weekIdx: number, note: string) => void;
  setTarikh: (scope: string, itemKey: string, weekIdx: number, tarikh: string) => void;
  setDiperiksaOleh: (scope: string, weekIdx: number, name: string) => void;
};

export const useTugasan = create<TugasanState>((set) => ({
  entriesByMonth: { [TUGASAN_SEED_SCOPE]: TUGASAN_SEED_ENTRIES },
  signOffByMonth: { [TUGASAN_SEED_SCOPE]: TUGASAN_SEED_SIGNOFF },

  toggle: (scope, itemKey, weekIdx, today, managerName) =>
    set((s) => {
      const key = tugasanKey(itemKey, weekIdx);
      const scopeEntries = s.entriesByMonth[scope] ?? {};
      const cur = scopeEntries[key] ?? emptyEntry;
      const done = !cur.done;

      const scopeSignOff = s.signOffByMonth[scope] ?? {};
      const curSignOff = scopeSignOff[weekIdx] ?? emptySignOff;
      const nextSignOff =
        done && !curSignOff.diisikanOleh
          ? {
              ...curSignOff,
              diisikanOleh: managerName.toUpperCase(),
              tarikh: curSignOff.tarikh || today,
            }
          : curSignOff;

      return {
        entriesByMonth: {
          ...s.entriesByMonth,
          [scope]: {
            ...scopeEntries,
            [key]: { ...cur, done, tarikh: done && !cur.tarikh ? today : cur.tarikh },
          },
        },
        signOffByMonth: {
          ...s.signOffByMonth,
          [scope]: { ...scopeSignOff, [weekIdx]: nextSignOff },
        },
      };
    }),

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

  setDiperiksaOleh: (scope, weekIdx, name) =>
    set((s) => {
      const scopeSignOff = s.signOffByMonth[scope] ?? {};
      const cur = scopeSignOff[weekIdx] ?? emptySignOff;
      return {
        signOffByMonth: {
          ...s.signOffByMonth,
          [scope]: { ...scopeSignOff, [weekIdx]: { ...cur, diperiksaOleh: name } },
        },
      };
    }),
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
