import { Pressable, Text, View } from 'react-native';
import { WEEK_COLS } from '@/data/checklist';
import { useQueue } from '@/store/useQueue';
import { C } from '@/theme/scoring';

/**
 * What the offline queue has to say, on the screen where marking happens.
 *
 * Two different messages, and the difference matters. Marks still waiting are
 * reassurance — the work is safe, it just has not been sent. A rejection is the
 * opposite: the mark will never be sent, because someone else got to that week
 * first, and the supervisor has to know so they can decide what to do about it.
 */
export function QueueBanner() {
  const pending = useQueue((s) => s.pending);
  const rejected = useQueue((s) => s.rejected);
  const dismiss = useQueue((s) => s.dismiss);

  if (pending.length === 0 && rejected.length === 0) return null;

  return (
    <View className="gap-2 mt-3">
      {pending.length > 0 && (
        <View
          className="rounded-[10px] px-3.5 py-3 border"
          style={{ backgroundColor: C.warnBg, borderColor: C.warnLine }}
        >
          <Text className="font-sans-med text-[12.5px] leading-[19px]" style={{ color: C.warnInk }}>
            {pending.length} markah menunggu sambungan. Ia disimpan dalam telefon
            dan akan dihantar sendiri.
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
            Markah {r.personLabel} tidak dapat dihantar
          </Text>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-2 mt-1.5">
            {WEEK_COLS[r.input.weekNo - 1]} sudah dinilai oleh orang lain sebelum
            telefon ini dapat sambungan, jadi markah itu kekal. Nilai semula jika
            markah anda yang betul.
          </Text>
          <Pressable
            onPress={() => void dismiss(r.id)}
            accessibilityRole="button"
            className="self-start mt-2.5 px-3 py-1.5 rounded-lg border"
            style={{ borderColor: C.fail }}
          >
            <Text className="font-sans-med text-[12px]" style={{ color: C.fail }}>
              Faham
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
