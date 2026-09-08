import { useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BackLink } from '@/components/BackLink';
import { Card } from '@/components/Card';
import { PerkaraBars } from '@/components/PerkaraBars';
import { Screen } from '@/components/Screen';
import { MONTHS } from '@/data/checklist';
import { WEEK_NOTES } from '@/data/crew';
import { findUser, useUsers } from '@/store/useUsers';
import { formForRole, isVerified, useMarks, weekMark } from '@/store/useMarks';
import { C, pctColor } from '@/theme/scoring';

export default function PersonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useUsers((s) => s.users);
  const person = findUser(users, id);
  const { monthIdx, submitted, submittedNotes, verified, passThreshold, verifyByManager } =
    useMarks();
  const verify = useMarks((s) => s.verify);

  if (!person) {
    return (
      <Screen>
        <BackLink label={MONTHS[monthIdx]} />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">
          Pekerja tidak dijumpai
        </Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          Akaun {id} tiada dalam senarai pengguna.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink label={MONTHS[monthIdx]} />

      <View className="flex-row gap-3 items-center mt-4">
        <Avatar init={person.init} size={46} />
        <View className="min-w-0 flex-1">
          <Text className="font-sans-semi text-[18px] text-ink">{person.name}</Text>
          <Text className="font-mono text-xs text-ink-5 mt-1">
            {person.id} · Pekerja kedai
          </Text>
        </View>
      </View>

      <View className="gap-2.5 mt-4">
        {person.w.map((_, i) => {
          const v = weekMark(person, i, submitted);
          const key = `${person.id}-${i}`;
          const ok = isVerified(key, verified);
          const note = submittedNotes[key] ?? WEEK_NOTES[key];
          const needsVerify = verifyByManager && v != null && !ok;

          return (
            <Card
              key={i}
              className="p-[15px]"
              style={{ borderColor: v == null ? '#EAEAE7' : C.line }}
            >
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text className="font-sans-semi text-[13.5px] text-ink">
                    Minggu {i + 1}
                  </Text>
                  <Text className="font-sans text-[11.5px] text-ink-5 mt-1">
                    {v == null
                      ? 'Belum dinilai'
                      : ok
                        ? 'Dinilai SV/AS · disahkan MGR'
                        : 'Dinilai SV/AS · belum disahkan'}
                  </Text>
                </View>
                <Text
                  className="font-mono-semi text-[17px]"
                  style={{ color: v == null ? C.ink7 : pctColor(v, passThreshold) }}
                >
                  {v == null ? '–' : `${v}%`}
                </Text>
              </View>

              {note && (
                <Text className="font-sans text-[12.5px] leading-[19px] text-ink-3 mt-3 pt-3 border-t border-rule">
                  {note}
                </Text>
              )}

              {needsVerify && (
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    onPress={() => verify(key)}
                    accessibilityRole="button"
                    className="flex-1 py-[11px] rounded-[9px] bg-ink items-center active:opacity-80"
                  >
                    <Text className="font-sans-semi text-[12.5px] text-white">
                      Sahkan markah
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        'Ubah markah',
                        `Buka semula checklist Minggu ${i + 1} untuk ${person.short} dan laraskan markah SV/AS.`
                      )
                    }
                    accessibilityRole="button"
                    className="flex-1 py-[11px] rounded-[9px] border border-line bg-card items-center active:opacity-70"
                  >
                    <Text className="font-sans-semi text-[12.5px] text-ink-2">Ubah</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })}
      </View>

      <Card className="p-4 mt-2.5">
        <Text className="font-sans-semi text-[13px] text-ink mb-4">
          Purata ikut perkara · {MONTHS[monthIdx]}
        </Text>
        <PerkaraBars values={person.perkara} form={formForRole(person.role)} />
      </Card>
    </Screen>
  );
}
