import { shortToIso } from '@/data/tugasanRows';

/**
 * When a Tugasan note or date typed on the phone is written to Postgres.
 *
 * It used to be written only when its text box lost focus. Closing the row
 * (or switching outlet, or leaving the screen) removes the box without that
 * ever happening, so a remark typed after the tick stayed on the phone and was
 * gone at the next restart. Now it is written a moment after typing stops, and
 * at once whenever its row goes away (store/useTugasan.ts, the Tugasan screen).
 */

/** A typed note or date is written this long after the last keystroke. */
export const AUTOSAVE_MS = 1500;

/** The open row on the Tugasan screen, `${itemKey}-${weekIdx}` (data/tugasan.ts tugasanKey). */
export function rowOfKey(key: string): { itemKey: string; weekIdx: number } | null {
  const at = key.lastIndexOf('-');
  if (at <= 0) return null;
  const weekIdx = Number(key.slice(at + 1));
  if (!Number.isInteger(weekIdx) || weekIdx < 0 || weekIdx > 3) return null;
  return { itemKey: key.slice(0, at), weekIdx };
}

/** A date that can be written as it stands: none, or a real one. "18/9" is still being typed. */
export const dateReady = (tarikh: string): boolean => !tarikh.trim() || shortToIso(tarikh) !== null;

/**
 * Rows with typing not yet written. Each edit bumps the row's version; a save
 * clears the row only if nothing was typed while it was being written, so a
 * keystroke that lands mid-save is saved by the next one.
 */
export function createUnsaved() {
  const versions = new Map<string, number>();
  return {
    /** Something was typed in the row. Returns the row's new version. */
    edit(row: string): number {
      const v = (versions.get(row) ?? 0) + 1;
      versions.set(row, v);
      return v;
    },
    /** The row's version, or undefined when everything typed is written. */
    current(row: string): number | undefined {
      return versions.get(row);
    },
    /** Version `v` of the row was written. */
    saved(row: string, v: number): void {
      if (versions.get(row) === v) versions.delete(row);
    },
  };
}
