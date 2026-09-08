import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ROLE_BLURB, ROLE_LABEL, ROLE_LADDER } from '@/data/users';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function Peranan() {
  const users = useUsers((s) => s.users);
  const history = useUsers((s) => s.history);

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Peranan</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        Siapa memegang apa. Area Manager dan Admin tidak boleh dikosongkan.
      </Text>

      <View className="gap-2.5 mt-[18px]">
        {[...ROLE_LADDER].reverse().map((r) => {
          const holders = users.filter((u) => u.role === r && u.active);
          return (
            <Card key={r} className="p-[15px]">
              <View className="flex-row items-baseline justify-between">
                <Text className="font-sans-semi text-[13px] text-ink">{ROLE_LABEL[r]}</Text>
                <Text className="font-mono-semi text-[11px] text-ink-6">
                  {holders.length}
                </Text>
              </View>
              <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-1.5">
                {ROLE_BLURB[r]}
              </Text>

              {holders.length === 0 ? (
                <Text
                  className="font-sans-med text-[12px] mt-3"
                  style={{ color: C.warn }}
                >
                  Tiada pemegang aktif.
                </Text>
              ) : (
                <View className="gap-2 mt-3">
                  {holders.map((u) => (
                    <Pressable
                      key={u.id}
                      onPress={() => router.push(`/user/${u.id}`)}
                      accessibilityRole="button"
                      className="flex-row items-center gap-2.5 active:opacity-60"
                    >
                      <Avatar init={u.init} size={28} />
                      <Text
                        className="flex-1 font-sans-med text-[12.5px] text-ink-2"
                        numberOfLines={1}
                      >
                        {u.name}
                      </Text>
                      <Text className="font-mono text-[10.5px] text-ink-6">
                        {u.id} · {u.branchId ?? 'HQ'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </View>

      <Card className="p-[15px] mt-2.5">
        <MonoLabel>Rekod tukar pangkat</MonoLabel>
        {history.length === 0 ? (
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2.5">
            Belum ada kenaikan atau penurunan pangkat direkod sesi ini.
          </Text>
        ) : (
          <View className="gap-2.5 mt-3">
            {history.map((h, i) => {
              const promoted =
                ROLE_LADDER.indexOf(h.to) > ROLE_LADDER.indexOf(h.from);
              return (
                <View key={`${h.id}-${i}`} className="flex-row items-center gap-2.5">
                  <View
                    className="w-[7px] h-[7px] rounded-full"
                    style={{ backgroundColor: promoted ? C.pass : C.warn }}
                  />
                  <View className="flex-1 min-w-0">
                    <Text
                      className="font-sans-med text-[12.5px] text-ink-2"
                      numberOfLines={1}
                    >
                      {h.name}
                    </Text>
                    <Text className="font-mono text-[10.5px] text-ink-5 mt-1">
                      {ROLE_LABEL[h.from]} → {ROLE_LABEL[h.to]} · {h.at}
                    </Text>
                  </View>
                  <Text
                    className="font-mono-semi text-[9.5px]"
                    style={{ color: promoted ? C.pass : C.warn }}
                  >
                    {promoted ? 'NAIK' : 'TURUN'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </Screen>
  );
}
