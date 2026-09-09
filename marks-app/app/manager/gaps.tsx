import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { monthStats, useMarks, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers, visibleStaff } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function Gaps() {
  const submitted = useMarks((s) => s.submitted);
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const crew = visibleStaff(users, me);
  const stats = monthStats(crew, submitted);

  const rows = crew.map((p) => {
    const missing = p.w
      .map((_, i) => (weekMark(p, i, submitted) == null ? i + 1 : null))
      .filter((n): n is number => n != null);
    return { person: p, missing };
  }).filter((r) => r.missing.length > 0);

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Belum dinilai</Text>
      <Text className="font-sans text-sm leading-[20px] text-ink-4 mt-2">
        {stats.gaps} daripada {stats.cellTotal} kotak minggu × pekerja masih kosong. Ini
        yang jadi #DIV/0! dalam fail Excel.
      </Text>

      {rows.length === 0 ? (
        <Card className="p-5 mt-[18px] items-center">
          <Text className="font-sans-med text-sm text-ink-3">
            Semua kotak sudah diisi bulan ini.
          </Text>
        </Card>
      ) : (
        <View className="gap-2.5 mt-[18px]">
          {rows.map(({ person, missing }) => (
            <Card key={person.id} className="px-4 py-[15px]">
              <View className="flex-row items-center gap-3">
                <Avatar init={person.init} />
                <View className="flex-1 min-w-0">
                  <Text className="font-sans-semi text-[13.5px] text-ink">
                    {person.name}
                  </Text>
                  <Text className="font-sans text-[11.5px] text-ink-5 mt-1">
                    {person.id} · minggu {missing.join(', ')}
                  </Text>
                </View>
                <Text className="font-mono-semi text-[18px]" style={{ color: C.warn }}>
                  {missing.length}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {rows.length > 0 && (
        <Pressable
          onPress={() =>
            Alert.alert(
              'Peringatan dihantar',
              `${rows.length} SV/AS akan menerima senarai pekerja yang belum dinilai.`
            )
          }
          accessibilityRole="button"
          className="mt-3.5 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
        >
          <Text className="font-sans-semi text-sm text-white">
            Hantar peringatan ke SV/AS
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}
