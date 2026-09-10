import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BackLink } from '@/components/BackLink';
import { Card } from '@/components/Card';
import { PerkaraBars } from '@/components/PerkaraBars';
import { Screen } from '@/components/Screen';
import { useMyWeeks } from '@/store/useMyWeeks';
import { ROLE_LABEL } from '@/data/users';
import { useMarks } from '@/store/useMarks';
import { findUser, primaryOf, useUsers } from '@/store/useUsers';
import { pctColor } from '@/theme/scoring';

export default function WeekDetail() {
  const { index } = useLocalSearchParams<{ index: string }>();
  const passThreshold = useMarks((s) => s.passThreshold);
  const users = useUsers((s) => s.users);
  const weeks = useMyWeeks((s) => s.weeks);
  // Reachable by deep link, or after a restart before the list has loaded.
  const week = weeks[Number(index)] as (typeof weeks)[number] | undefined;
  // Who actually scored this particular week, not just "a" supervisor —
  // imported marks carry no scored_by, so that case falls back to whoever
  // marks first today.
  const supervisor = (week?.scoredBy ? findUser(users, week.scoredBy) : undefined) ?? primaryOf(users, 'supervisor');
  const svName = supervisor?.name ?? 'SV/AS';

  if (!week) {
    return (
      <Screen>
        <BackLink label="Kembali" />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">
          Markah tidak dijumpai
        </Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          Buka semula dari senarai markah mingguan.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink label="Kembali" />

      <Text className="font-sans-semi text-[19px] text-ink mt-4">{week.label}</Text>
      <Text className="font-sans text-[11.5px] text-ink-5 mt-1.5">
        Dinilai oleh {svName} ({supervisor?.id}) · checklist mingguan
      </Text>

      <Card className="p-[18px] mt-4">
        <View className="flex-row items-baseline gap-1.5">
          <Text
            className="font-mono-semi text-[38px]"
            style={{ color: pctColor(week.adjustedPct ?? week.pct, passThreshold) }}
          >
            {week.adjustedPct ?? week.pct}
          </Text>
          <Text className="font-mono text-[15px] text-ink-6">% · {week.total}/110</Text>
        </View>
        {week.adjustedPct != null && (
          <Text className="font-sans text-[12px] text-ink-5 mt-2">
            Diselaraskan oleh Area Manager. Markah asal SV/AS: {week.pct}%.
          </Text>
        )}
        <View className="mt-[18px]">
          <PerkaraBars values={week.perkara} />
        </View>
      </Card>

      <Card className="p-[17px] mt-2.5">
        <View className="flex-row gap-3 items-center">
          <Avatar init={supervisor?.init ?? '?'} size={32} />
          <View>
            <Text className="font-sans-semi text-[13px] text-ink">{svName}</Text>
            <Text className="font-mono text-[10.5px] text-ink-5 mt-1">
              {supervisor?.id} · {ROLE_LABEL.supervisor}
            </Text>
          </View>
        </View>
        <Text className="font-sans text-[13.5px] leading-[22px] text-ink-2 mt-3.5">
          {week.note}
        </Text>
      </Card>

      <View className="flex-row gap-2.5 mt-4">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/staff'))}
          accessibilityRole="button"
          className="flex-1 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
        >
          <Text className="font-sans-semi text-sm text-white">Terima</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/query/[markId]',
              params: {
                markId: String(week.markId),
                label: `Soalan · ${week.label}`,
                otherName: svName,
              },
            })
          }
          accessibilityRole="button"
          className="flex-1 py-3.5 rounded-xl border border-[#D6D6D2] bg-card items-center active:opacity-70"
        >
          <Text className="font-sans-semi text-sm text-ink-2">Tanya SV</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
