import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { PerkaraBars } from '@/components/PerkaraBars';
import { Screen } from '@/components/Screen';
import { STAFF_WEEKS } from '@/data/crew';
import { FORM } from '@/data/checklist';
import { useMarks } from '@/store/useMarks';
import { pctBg, pctColor } from '@/theme/scoring';

export default function StaffRekod() {
  const passThreshold = useMarks((s) => s.passThreshold);

  const average = FORM.map((_, i) =>
    Math.round(
      STAFF_WEEKS.reduce((sum, w) => sum + w.perkara[i], 0) / STAFF_WEEKS.length
    )
  );

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Rekod saya</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {STAFF_WEEKS.length} minggu terakhir yang sudah dinilai.
      </Text>

      <Card className="p-4 mt-[18px]">
        <Text className="font-sans-semi text-[13px] text-ink mb-4">
          Purata ikut perkara · 4 minggu
        </Text>
        <PerkaraBars values={average} />
      </Card>

      <View className="gap-2 mt-2.5">
        {STAFF_WEEKS.map((w, i) => (
          <Pressable
            key={w.label}
            onPress={() => router.push(`/week/${i}`)}
            accessibilityRole="button"
            className="bg-card border border-line rounded-xl px-3.5 py-3 active:opacity-70"
          >
            <View className="flex-row items-center gap-3">
              <View
                className="px-2.5 py-[9px] rounded-[9px]"
                style={{ backgroundColor: pctBg(w.pct, passThreshold) }}
              >
                <Text
                  className="font-mono-semi text-[15px]"
                  style={{ color: pctColor(w.pct, passThreshold) }}
                >
                  {w.pct}%
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="font-sans-semi text-[13.5px] text-ink">{w.label}</Text>
                <Text
                  className="font-sans text-[11.5px] text-ink-5 mt-1"
                  numberOfLines={1}
                >
                  {w.note}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
