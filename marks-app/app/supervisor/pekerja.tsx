import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Screen } from '@/components/Screen';
import { useBranchLabel } from '@/store/useBranches';
import { useMarks, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { staffOfBranch, useUsers } from '@/store/useUsers';
import { C, pctBg, pctColor } from '@/theme/scoring';
import { SignOutButton } from '@/components/SignOutButton';

export default function Pekerja() {
  const submitted = useMarks((s) => s.submitted);
  const passThreshold = useMarks((s) => s.passThreshold);
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = me?.branchId ?? null;
  const crew = staffOfBranch(users, branchId);
  const branchLabel = useBranchLabel();

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Pekerja</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {crew.length} pekerja di {branchLabel(branchId)}. Purata dikira daripada minggu yang sudah
        dinilai sahaja.
      </Text>

      <View className="gap-2 mt-[18px]">
        {crew.map((p) => {
          const marks = p.w
            .map((_, i) => weekMark(p, i, submitted))
            .filter((v): v is number => v != null);
          const avg = marks.length
            ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length)
            : null;

          return (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/person/${p.id}`)}
              accessibilityRole="button"
              className="bg-card border border-line rounded-xl px-3.5 py-3 active:opacity-70"
            >
              <View className="flex-row items-center gap-3">
                <Avatar init={p.init} />
                <View className="flex-1 min-w-0">
                  <Text className="font-sans-semi text-[13.5px] text-ink">{p.name}</Text>
                  <Text className="font-mono text-[11px] text-ink-5 mt-1">
                    {p.id} · {marks.length}/4 minggu
                  </Text>
                </View>
                {avg == null ? (
                  <Text className="font-mono-med text-[12.5px] text-ink-7">–</Text>
                ) : (
                  <View
                    className="px-2.5 py-[7px] rounded-lg"
                    style={{ backgroundColor: pctBg(avg, passThreshold) }}
                  >
                    <Text
                      className="font-mono-semi text-[12.5px]"
                      style={{ color: pctColor(avg, passThreshold) }}
                    >
                      {avg}%
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <SignOutButton />
    </Screen>
  );
}
