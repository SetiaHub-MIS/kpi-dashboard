import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BackLink } from '@/components/BackLink';
import { Card } from '@/components/Card';
import { PerkaraBars } from '@/components/PerkaraBars';
import { Screen } from '@/components/Screen';
import { MONTHS } from '@/data/checklist';
import { useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { findUser, useUsers } from '@/store/useUsers';
import { formForRole, isVerified, useMarks, weekMark } from '@/store/useMarks';
import { C, pctColor } from '@/theme/scoring';

export default function PersonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useUsers((s) => s.users);
  const person = findUser(users, id);
  const {
    monthIdx,
    submitted,
    submittedNotes,
    verified,
    adjusted,
    markMax,
    passThreshold,
    verifyByManager,
  } = useMarks();
  const verify = useMarks((s) => s.verify);
  const me = currentUser(users, useSession((x) => x.currentUserId));
  const t = useT();
  // Which week's "Ubah" editor is open, if any.
  const [adjustingKey, setAdjustingKey] = useState<string | null>(null);
  const [draftPct, setDraftPct] = useState('');

  if (!person) {
    return (
      <Screen>
        <BackLink label={MONTHS[monthIdx]} />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">
          {t('pekerja_tak_dijumpai')}
        </Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          {t('akaun_tiada_senarai', { id })}
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
            {person.id} · {t('pekerja_kedai_label')}
          </Text>
        </View>
      </View>

      <View className="gap-2.5 mt-4">
        {person.w.map((_, i) => {
          const v = weekMark(person, i, submitted);
          const key = `${person.id}-${i}`;
          const ok = isVerified(key, verified);
          const note = submittedNotes[key];
          const needsVerify = verifyByManager && v != null && !ok;
          const overridePct = adjusted[key];
          const isAdjusting = adjustingKey === key;

          const startAdjust = () => {
            setAdjustingKey(key);
            setDraftPct(String(v ?? ''));
          };

          const saveAdjust = () => {
            const max = markMax[key];
            const pct = Math.max(0, Math.min(100, Math.round(Number(draftPct))));
            if (!me || !max || !Number.isFinite(pct)) return;
            const adjustedTo = Math.round((pct / 100) * max);
            void verify(key, { verifiedBy: me.id, adjustedTo });
            setAdjustingKey(null);
          };

          return (
            <Card
              key={i}
              className="p-[15px]"
              style={{ borderColor: v == null ? '#EAEAE7' : C.line }}
            >
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text className="font-sans-semi text-[13.5px] text-ink">
                    {t('minggu_n', { n: i + 1 })}
                  </Text>
                  <Text className="font-sans text-[11.5px] text-ink-5 mt-1">
                    {v == null
                      ? t('belum_dinilai')
                      : ok
                        ? overridePct != null
                          ? t('status_diselaraskan')
                          : t('status_disahkan')
                        : t('status_belum_disahkan')}
                  </Text>
                </View>
                <Text
                  className="font-mono-semi text-[17px]"
                  style={{
                    color:
                      v == null ? C.ink7 : pctColor(overridePct ?? v, passThreshold),
                  }}
                >
                  {v == null ? '–' : `${overridePct ?? v}%`}
                </Text>
              </View>

              {overridePct != null && v != null && (
                <Text className="font-mono text-[10.5px] text-ink-5 mt-1.5">
                  {t('markah_asal_sv', { value: v })}
                </Text>
              )}

              {note && (
                <Text className="font-sans text-[12.5px] leading-[19px] text-ink-3 mt-3 pt-3 border-t border-rule">
                  {note}
                </Text>
              )}

              {needsVerify && !isAdjusting && (
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    onPress={() => void verify(key, me ? { verifiedBy: me.id } : undefined)}
                    accessibilityRole="button"
                    className="flex-1 py-[11px] rounded-[9px] bg-ink items-center active:opacity-80"
                  >
                    <Text className="font-sans-semi text-[12.5px] text-white">
                      {t('sahkan_markah')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={startAdjust}
                    accessibilityRole="button"
                    className="flex-1 py-[11px] rounded-[9px] border border-line bg-card items-center active:opacity-70"
                  >
                    <Text className="font-sans-semi text-[12.5px] text-ink-2">{t('ubah')}</Text>
                  </Pressable>
                </View>
              )}

              {isAdjusting && (
                <View className="mt-3 pt-3 border-t border-rule">
                  <Text className="font-sans text-[12px] text-ink-4 mb-2">
                    {t('peratus_baharu_minggu', { week: i + 1, name: person.short })}
                  </Text>
                  <View className="flex-row gap-2 items-center">
                    <TextInput
                      value={draftPct}
                      onChangeText={setDraftPct}
                      keyboardType="number-pad"
                      maxLength={3}
                      className="font-mono-semi text-[15px] text-ink border border-line rounded-[9px] px-3 py-2 w-[70px] text-center"
                    />
                    <Text className="font-mono text-[13px] text-ink-5">%</Text>
                    <Pressable
                      onPress={saveAdjust}
                      accessibilityRole="button"
                      className="flex-1 py-[11px] rounded-[9px] bg-ink items-center active:opacity-80"
                    >
                      <Text className="font-sans-semi text-[12.5px] text-white">
                        {t('simpan_pelarasan')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAdjustingKey(null)}
                      accessibilityRole="button"
                      className="py-[11px] px-3 rounded-[9px] border border-line bg-card items-center active:opacity-70"
                    >
                      <Text className="font-sans-semi text-[12.5px] text-ink-2">{t('batal')}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Card>
          );
        })}
      </View>

      <Card className="p-4 mt-2.5">
        <Text className="font-sans-semi text-[13px] text-ink mb-4">
          {t('purata_ikut_perkara_bulan', { month: MONTHS[monthIdx] })}
        </Text>
        <PerkaraBars values={person.perkara} form={formForRole(person.role)} />
      </Card>
    </Screen>
  );
}
