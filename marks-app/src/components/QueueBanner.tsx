import { Pressable, Text, View } from 'react-native';
import { WEEK_COLS } from '@/data/checklist';
import { useT } from '@/store/useLocale';
import { useMarks } from '@/store/useMarks';
import { useQueue } from '@/store/useQueue';
import { useReturns } from '@/store/useReturns';
import { C } from '@/theme/scoring';

/**
 * Whether the marks on this screen actually reached Postgres.
 *
 * Three different messages, and the differences matter. Marks still waiting are
 * reassurance — the work is safe, it just has not been sent. A rejection means
 * it will never be sent, because someone reached that week first. And a refused
 * write is neither: the database was reached and said no, so it is not queued
 * and not retried, and saying nothing would leave a mark looking saved when it
 * is only on screen.
 */
export function QueueBanner() {
  const pending = useQueue((s) => s.pending);
  const rejected = useQueue((s) => s.rejected);
  const dismiss = useQueue((s) => s.dismiss);
  const markError = useMarks((s) => s.saveError);
  const clearMarkError = useMarks((s) => s.clearSaveError);
  const returnError = useReturns((s) => s.saveError);
  const clearReturnError = useReturns((s) => s.clearSaveError);
  const t = useT();

  // Whichever refused most recently; both read the same to the person holding
  // the phone, and stacking two identical red boxes would help nobody.
  const saveError = markError ?? returnError;
  const clearSaveError = () => {
    clearMarkError();
    clearReturnError();
  };

  if (pending.length === 0 && rejected.length === 0 && !saveError) return null;

  return (
    <View className="gap-2 mt-3">
      {saveError && (
        <View
          className="rounded-[10px] px-3.5 py-3 border"
          style={{ backgroundColor: C.failBg, borderColor: C.fail }}
        >
          <Text className="font-sans-semi text-[13px]" style={{ color: C.fail }}>
            {t('markah_gagal_simpan')}
          </Text>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-2 mt-1.5">
            {t('markah_ditolak_pelayan')}
          </Text>
          <Text className="font-mono text-[10.5px] text-ink-5 mt-2">{saveError}</Text>
          <Pressable
            onPress={clearSaveError}
            accessibilityRole="button"
            className="self-start mt-2.5 px-3 py-1.5 rounded-lg border"
            style={{ borderColor: C.fail }}
          >
            <Text className="font-sans-med text-[12px]" style={{ color: C.fail }}>
              {t('faham')}
            </Text>
          </Pressable>
        </View>
      )}

      {pending.length > 0 && (
        <View
          className="rounded-[10px] px-3.5 py-3 border"
          style={{ backgroundColor: C.warnBg, borderColor: C.warnLine }}
        >
          <Text className="font-sans-med text-[12.5px] leading-[19px]" style={{ color: C.warnInk }}>
            {t('markah_menunggu', { count: pending.length })}
          </Text>
        </View>
      )}

      {rejected.map((r) => (
        <View
          key={r.id}
          className="rounded-[10px] px-3.5 py-3 border"
          style={{ backgroundColor: C.failBg, borderColor: C.fail }}
        >
          <Text className="font-sans-semi text-[13px]" style={{ color: C.fail }}>
            {t('markah_ditolak_orang_lain', { person: r.personLabel })}
          </Text>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-2 mt-1.5">
            {t('markah_ditolak_detail', { week: WEEK_COLS[r.input.weekNo - 1] })}
          </Text>
          <Pressable
            onPress={() => void dismiss(r.id)}
            accessibilityRole="button"
            className="self-start mt-2.5 px-3 py-1.5 rounded-lg border"
            style={{ borderColor: C.fail }}
          >
            <Text className="font-sans-med text-[12px]" style={{ color: C.fail }}>
              {t('faham')}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
