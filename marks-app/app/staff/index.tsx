import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Screen } from '@/components/Screen';
import { ME_ID, STAFF_SPARK, STAFF_WEEKS } from '@/data/crew';
import { useBranchLabel } from '@/store/useBranches';
import { useMarks } from '@/store/useMarks';
import { findUser, useUsers } from '@/store/useUsers';
import { C, pctBg, pctColor } from '@/theme/scoring';

export default function StaffHome() {
  const passThreshold = useMarks((s) => s.passThreshold);
  const me = findUser(useUsers((s) => s.users), ME_ID);
  const branchLabel = useBranchLabel();
  const latest = STAFF_WEEKS[0];
  const delta = latest.pct - STAFF_WEEKS[1].pct;

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[12.5px] text-ink-5">
            Selasa, 8 September 2026
          </Text>
          <Text className="font-sans-semi text-xl text-ink mt-1.5">{me?.name}</Text>
          <Text className="font-mono text-[11px] text-ink-5 mt-1.5">
            {me?.id} · {branchLabel(me?.branchId)}
          </Text>
        </View>
        <Avatar init={me?.init ?? '?'} size={40} />
      </View>

      <View className="bg-ink rounded-2xl p-5 mt-4">
        <Text className="font-mono-med text-[10px] uppercase tracking-label text-[#8E9089]">
          Minggu 1 · September
        </Text>
        <View className="flex-row items-baseline gap-1.5 mt-3">
          <Text className="font-mono-semi text-[44px] text-white">{latest.pct}</Text>
          <Text className="font-mono text-base text-[#75776F]">
            % · {latest.total}/110
          </Text>
          <Text className="font-mono-med text-xs text-[#7FCB9E] ml-auto">
            ▲ {delta}
          </Text>
        </View>

        <View className="flex-row gap-1 items-end h-9 mt-[18px]">
          {STAFF_SPARK.map((v, i) => (
            <View
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: Math.round(((v - 70) / 20) * 28) + 6,
                backgroundColor: i === STAFF_SPARK.length - 1 ? '#fff' : '#4A4C4E',
              }}
            />
          ))}
        </View>

        <Text className="font-sans text-[11.5px] leading-[17px] text-[#A8AAA3] mt-3.5 pt-3 border-t border-[#2B2C2E]">
          Kebersihan Kedai perkara paling rendah (72%). Tandas dan sawang disebut dua
          minggu berturut.
        </Text>
      </View>

      <Text className="font-sans-semi text-[13.5px] text-ink mt-5 mb-2.5 px-0.5">
        Markah mingguan
      </Text>

      <View className="gap-2">
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
                <Text className="font-sans text-[11.5px] text-ink-5 mt-1">
                  {w.total}/110 · Nur Syahirah
                </Text>
              </View>
              {w.unread && (
                <View
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: C.link }}
                />
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
