import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { MONTHS, WEEK_COLS } from '@/data/checklist';
import { isVerified, useMarks, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { staffOfBranch, useUsers } from '@/store/useUsers';
import { C, pctColor } from '@/theme/scoring';

export default function Rekod() {
  const { monthIdx, submitted, verified, passThreshold } = useMarks();
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const crew = staffOfBranch(users, me?.branchId ?? null);

  const weeks = WEEK_COLS.map((label, i) => ({
    label,
    index: i,
    rows: crew.map((p) => ({ person: p, v: weekMark(p, i, submitted) })).filter(
      (r) => r.v != null
    ),
  }));

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Rekod penilaian</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        Markah yang anda hantar untuk {MONTHS[monthIdx]}.
      </Text>

      <View className="gap-2.5 mt-[18px]">
        {weeks.map((w) => (
          <Card key={w.index} className="p-[15px]">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-sans-semi text-[13px] text-ink">
                Minggu {w.index + 1}
              </Text>
              <Text className="font-mono text-[10.5px] text-ink-6">
                {w.rows.length}/{crew.length} dinilai
              </Text>
            </View>

            {w.rows.length === 0 ? (
              <Text className="font-sans text-[12.5px] text-ink-6 mt-3">
                Belum ada markah direkod.
              </Text>
            ) : (
              <View className="mt-3 gap-2">
                {w.rows.map(({ person, v }) => (
                  <Pressable
                    key={person.id}
                    onPress={() => router.push(`/person/${person.id}`)}
                    accessibilityRole="button"
                    className="flex-row items-center gap-2.5 active:opacity-60"
                  >
                    <Text
                      className="flex-1 font-sans-med text-[12.5px] text-ink-2"
                      numberOfLines={1}
                    >
                      {person.short}
                    </Text>
                    {isVerified(`${person.id}-${w.index}`, verified) && (
                      <View
                        className="px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: C.passBg }}
                      >
                        <Text
                          className="font-mono-semi text-[9px]"
                          style={{ color: C.pass }}
                        >
                          MGR
                        </Text>
                      </View>
                    )}
                    <Text
                      className="font-mono-semi text-[13px]"
                      style={{ color: pctColor(v!, passThreshold) }}
                    >
                      {v}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
