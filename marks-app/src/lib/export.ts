import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Period } from '@/data/period';
import { supabase } from '@/lib/supabase';

export type ExportResult = {
  filename: string;
  uri: string;
  /** False when the file was written but the device offered no way to share it. */
  shared: boolean;
};

/**
 * Calls the `xlsx-export` Edge Function and hands the result to the share
 * sheet. The function runs the query under the caller's own session — it
 * never sees more than this account already can — and returns the workbook
 * base64-encoded rather than as a raw binary response, which is the more
 * reliable path through the Supabase JS client on React Native.
 *
 * Returns rather than swallows the outcome of each step, because a phone
 * that writes the file fine but has no share target must not look identical
 * to one where nothing happened — that gap is what made a real failure
 * unreportable the first time this ran on a device.
 */
export async function exportMonthXlsx(period: Period): Promise<ExportResult> {
  const { data, error } = await supabase.functions.invoke('xlsx-export', {
    body: { year: period.year, month: period.month },
  });

  if (error) throw error;
  if (!data?.base64) throw new Error(data?.error ?? 'Eksport tidak menghasilkan fail.');

  const filename = data.filename as string;
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(data.base64 as string, { encoding: 'base64' });

  const shared = await Sharing.isAvailableAsync();
  if (shared) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: filename,
    });
  }

  return { filename, uri: file.uri, shared };
}
