import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Period } from '@/data/period';
import { supabase } from '@/lib/supabase';

/**
 * Calls the `xlsx-export` Edge Function and hands the result to the share
 * sheet. The function runs the query under the caller's own session — it
 * never sees more than this account already can — and returns the workbook
 * base64-encoded rather than as a raw binary response, which is the more
 * reliable path through the Supabase JS client on React Native.
 */
export async function exportMonthXlsx(period: Period): Promise<void> {
  const { data, error } = await supabase.functions.invoke('xlsx-export', {
    body: { year: period.year, month: period.month },
  });

  if (error) throw error;
  if (!data?.base64) throw new Error(data?.error ?? 'Eksport tidak menghasilkan fail.');

  const file = new File(Paths.cache, data.filename as string);
  file.create({ overwrite: true });
  file.write(data.base64 as string, { encoding: 'base64' });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: data.filename as string,
    });
  }
}
