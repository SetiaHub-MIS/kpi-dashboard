import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { currentUser, useSession } from '@/store/useSession';
import { useMyWeeks } from '@/store/useMyWeeks';
import { useBranchLabel } from '@/store/useBranches';
import { ROLE_LABEL } from '@/data/users';
import { useMarks } from '@/store/useMarks';
import { findUser, primaryOf, useUsers } from '@/store/useUsers';
import { pctColor } from '@/theme/scoring';

export default function Profil() {
  const passThreshold = useMarks((s) => s.passThreshold);
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const supervisor = primaryOf(users, 'supervisor');
  const branchLabel = useBranchLabel();
  const weeks = useMyWeeks((s) => s.weeks);
  const avg = weeks.length
    ? Math.round(weeks.reduce((sum, w) => sum + w.pct, 0) / weeks.length)
    : 0;

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Profil</Text>

      <Card className="p-[18px] mt-[18px] items-center">
        <Avatar init={me?.init ?? '?'} size={56} />
        <Text className="font-sans-semi text-[17px] text-ink mt-3">{me?.name}</Text>
        <Text className="font-mono text-[11.5px] text-ink-5 mt-1.5">
          {me?.id} · {branchLabel(me?.branchId)}
        </Text>
        <View className="flex-row items-baseline gap-1.5 mt-4">
          <Text
            className="font-mono-semi text-[30px]"
            style={{ color: pctColor(avg, passThreshold) }}
          >
            {avg}
          </Text>
          <Text className="font-mono text-[13px] text-ink-6">
            % purata {weeks.length} minggu
          </Text>
        </View>
      </Card>

      <Card className="p-[18px] mt-2.5">
        <MonoLabel>Penyelia</MonoLabel>
        <View className="flex-row gap-3 items-center mt-3">
          <Avatar init={supervisor?.init ?? '?'} size={36} />
          <View>
            <Text className="font-sans-semi text-[13.5px] text-ink">
              {supervisor?.name ?? 'Tiada penyelia'}
            </Text>
            <Text className="font-mono text-[10.5px] text-ink-5 mt-1">
              {supervisor?.id} · {ROLE_LABEL.supervisor}
            </Text>
          </View>
        </View>
      </Card>

      <Pressable
        onPress={() => router.replace('/')}
        accessibilityRole="button"
        className="mt-2.5 py-3.5 rounded-xl border border-[#D6D6D2] bg-card items-center active:opacity-70"
      >
        <Text className="font-sans-semi text-sm text-ink-2">Tukar peranan</Text>
      </Pressable>
    </Screen>
  );
}
