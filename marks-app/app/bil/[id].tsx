import { useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { ReturnPhotos } from '@/components/ReturnPhotos';
import { Screen } from '@/components/Screen';
import {
  Disposition,
  STAGE_OWNER,
  TODAY_ISO,
  daysBetween,
  fmtDate,
  isCleared,
  nextStage,
  ownerForRole,
  stagesFor,
  turnaroundDays,
} from '@/data/returns';
import { dispositionLabel, reasonLabel, roleLabel, stageLabel } from '@/i18n/labels';
import { useReturns } from '@/store/useReturns';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function ReturnDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const records = useReturns((s) => s.records);
  const segregate = useReturns((s) => s.segregate);
  const recordStage = useReturns((s) => s.recordStage);
  const undoStage = useReturns((s) => s.undoStage);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const record = records.find((r) => r.id === id);

  if (!record) {
    return (
      <Screen>
        <BackLink label={t('tab_pulangan')} />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">{t('bil_tak_dijumpai')}</Text>
      </Screen>
    );
  }

  const myOwner = ownerForRole(me?.role);
  // null until this bill has reached Postgres; photos hang off the row id.
  const photoReturnId = useReturns((s) => s.ids)[record?.id ?? ''] ?? null;
  const stage = nextStage(record);
  const cleared = isCleared(record);
  const stages = stagesFor(record.disposition);
  const canAct = stage != null && STAGE_OWNER[stage] === myOwner;

  const act = () => {
    if (!stage) return;
    if (!canAct) {
      Alert.alert(
        t('bukan_tindakan_anda'),
        t('stage_direkod_oleh', {
          stage: stageLabel(stage, locale),
          role: roleLabel(STAGE_OWNER[stage] === 'clerk' ? 'clerk' : 'store', locale),
        })
      );
      return;
    }
    recordStage(record.id, stage, TODAY_ISO, me?.id);
  };

  return (
    <Screen>
      <BackLink label={t('tab_pulangan')} />

      <View className="flex-row items-center gap-2.5 mt-4">
        <Text className="flex-1 font-sans-semi text-[20px] text-ink">{record.billNo}</Text>
        <View
          className="px-2 py-[5px] rounded-md"
          style={{ backgroundColor: record.reason === 'damage' ? C.warnBg : C.failBg }}
        >
          <Text
            className="font-mono-semi text-[10px]"
            style={{ color: record.reason === 'damage' ? C.warnInk : C.fail }}
          >
            {reasonLabel(record.reason, locale).toUpperCase()}
          </Text>
        </View>
      </View>
      <Text className="font-mono text-[11.5px] text-ink-5 mt-1.5">
        {t('bil_outlet', { date: fmtDate(record.billDate), outlet: record.outlet })}
      </Text>

      <Card className="p-[15px] mt-4">
        <MonoLabel>{t('terima_clear')}</MonoLabel>
        <View className="flex-row items-baseline gap-1.5 mt-2.5">
          <Text
            className="font-mono-semi text-[34px]"
            style={{
              color: cleared
                ? C.pass
                : turnaroundDays(record) > 7
                  ? C.fail
                  : turnaroundDays(record) > 3
                    ? C.warn
                    : C.ink,
            }}
          >
            {turnaroundDays(record)}
          </Text>
          <Text className="font-mono text-[15px] text-ink-6">
            {t('hari')}{cleared ? '' : t('masih_berjalan_suffix')}
          </Text>
        </View>
        <Text className="font-sans text-[12.5px] leading-[19px] text-ink-3 mt-3 pt-3 border-t border-rule">
          {record.remark}
        </Text>
        <Text className="font-mono text-[10.5px] text-ink-5 mt-2">
          {t('pembekal_colon', { name: record.supplier })}
        </Text>
      </Card>

      {/* Damage only: an expired-stock return is a date on a label, and a photo
          of it proves nothing worth storing. */}
      {record.reason === 'damage' && (
        <ReturnPhotos
          returnId={photoReturnId}
          ref={record.id}
          branchId={record.branchId}
          canEdit={myOwner != null}
          uploadedBy={me?.id}
        />
      )}

      {record.disposition == null ? (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('asingkan_tentukan')}</MonoLabel>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2.5">
            {t('asingkan_intro')}
          </Text>
          <View className="flex-row gap-2 mt-3">
            {(['supplier', 'discard'] as Disposition[]).map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  if (myOwner !== 'store') {
                    Alert.alert(t('bukan_tindakan_anda'), t('pengasingan_bukan_anda'));
                    return;
                  }
                  segregate(record.id, d, TODAY_ISO, me?.id);
                }}
                accessibilityRole="button"
                className="flex-1 py-3 rounded-[10px] items-center border"
                style={{ borderColor: C.line, backgroundColor: C.card }}
              >
                <Text className="font-sans-semi text-[12.5px] text-ink-2">
                  {dispositionLabel(d, locale)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : (
        <Card className="p-[15px] mt-2.5">
          <View className="flex-row items-center gap-2.5">
            <MonoLabel>{t('tindakan_label')}</MonoLabel>
            <Text className="flex-1 font-sans-semi text-[13px] text-ink text-right">
              {dispositionLabel(record.disposition, locale)}
            </Text>
          </View>
        </Card>
      )}

      <Card className="p-[15px] mt-2.5">
        <MonoLabel>{t('jejak_masa')}</MonoLabel>
        <View className="mt-3">
          {stages.map((s, i) => {
            const on = record.events[s];
            const prev = i > 0 ? record.events[stages[i - 1]] : undefined;
            const gap = on && prev ? daysBetween(prev, on) : null;
            const isNext = s === stage;
            return (
              <View key={s} className="flex-row gap-3">
                <View className="items-center" style={{ width: 14 }}>
                  <View
                    className="w-[10px] h-[10px] rounded-full mt-1"
                    style={{
                      backgroundColor: on ? C.pass : isNext ? C.ink : C.ink8,
                    }}
                  />
                  {i < stages.length - 1 && (
                    <View className="flex-1 w-[2px] my-1" style={{ backgroundColor: C.rule }} />
                  )}
                </View>
                <View className="flex-1 pb-4">
                  <View className="flex-row items-baseline gap-2">
                    <Text
                      className={
                        on || isNext
                          ? 'flex-1 font-sans-semi text-[13px] text-ink'
                          : 'flex-1 font-sans-med text-[13px] text-ink-6'
                      }
                    >
                      {stageLabel(s, locale)}
                    </Text>
                    {gap != null && (
                      <Text className="font-mono text-[10.5px] text-ink-5">+{gap}h</Text>
                    )}
                  </View>
                  <Text className="font-mono text-[10.5px] text-ink-5 mt-1">
                    {on
                      ? fmtDate(on)
                      : t('menunggu_role', {
                          role: roleLabel(STAGE_OWNER[s] === 'clerk' ? 'clerk' : 'store', locale),
                        })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      {stage && (
        <Pressable
          onPress={act}
          accessibilityRole="button"
          className="mt-2.5 py-3.5 rounded-xl items-center"
          style={{ backgroundColor: canAct ? C.ink : C.line }}
        >
          <Text
            className="font-sans-semi text-sm"
            style={{ color: canAct ? '#fff' : C.ink6 }}
          >
            {canAct
              ? t('rekod_stage', { stage: stageLabel(stage, locale) })
              : t('menunggu_role', {
                  role: roleLabel(STAGE_OWNER[stage] === 'clerk' ? 'clerk' : 'store', locale),
                })}
          </Text>
        </Pressable>
      )}

      {stage == null && (
        <View
          className="mt-2.5 rounded-xl px-4 py-3.5 border items-center"
          style={{ backgroundColor: C.passBg, borderColor: C.pass }}
        >
          <Text className="font-sans-semi text-[13px]" style={{ color: C.pass }}>
            {t('selesai_stok_dilaraskan', { date: fmtDate(record.events.adjusted!) })}
          </Text>
        </View>
      )}

      {(() => {
        const last = [...stages].reverse().find((s) => record.events[s]);
        if (!last || last === 'received') return null;
        return (
          <Pressable
            onPress={() => undoStage(record.id, last)}
            accessibilityRole="button"
            className="mt-2 py-3 rounded-xl border border-line items-center bg-card active:opacity-70"
          >
            <Text className="font-sans-med text-[12.5px] text-ink-4">
              {t('batalkan_stage', { stage: stageLabel(last, locale) })}
            </Text>
          </Pressable>
        );
      })()}
    </Screen>
  );
}
