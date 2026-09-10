import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { QueueBanner } from '@/components/QueueBanner';
import { ReturnRow } from '@/components/ReturnRow';
import { Screen } from '@/components/Screen';
import {
  STAGE_OWNER,
  ageingStatus,
  nextStage,
  ownerForRole,
  submissionStats,
  turnaroundDays,
} from '@/data/returns';
import { roleLabel } from '@/i18n/labels';
import { useBranchLabel } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { openReturns, returnsVisibleTo, useReturns } from '@/store/useReturns';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function PulanganAktif() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = me?.branchId ?? null;
  const branchLabel = useBranchLabel();
  const records = useReturns((s) => s.records);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  // Only the two store roles can advance a return; others read it.
  const myOwner = ownerForRole(me?.role);
  const visible = returnsVisibleTo(records, me);
  const open = openReturns(visible);

  const mine = open.filter((r) => {
    const stage = nextStage(r);
    return stage != null && STAGE_OWNER[stage] === myOwner;
  });
  const others = open.filter((r) => !mine.includes(r));
  const oldest = open.reduce((n, r) => Math.max(n, turnaroundDays(r)), 0);

  // Rule 1 is scored over every list this branch received, cleared or not.
  const submission = submissionStats(visible);
  // Rules 2 and 3: past two months, and past the week allowed to fix that.
  const aged = open.filter((r) => ageingStatus(r) !== 'ok');
  const overdue = aged.filter((r) => ageingStatus(r) === 'overdue');

  return (
    <Screen>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <MonoLabel>
            {me?.name ?? '—'} · {me ? roleLabel(me.role, locale) : ''} · {branchLabel(branchId)}
          </MonoLabel>
          <Text className="font-sans-semi text-2xl text-ink mt-2">{t('tab_pulangan')}</Text>
        </View>
        {myOwner === 'store' && (
          <Pressable
            onPress={() => router.push('/pulangan-new')}
            accessibilityRole="button"
            accessibilityLabel={t('rekod_bil_a11y')}
            className="px-3.5 py-2.5 rounded-xl bg-ink active:opacity-80"
          >
            <Text className="font-sans-semi text-[13px] text-white">{t('tambah_bil')}</Text>
          </Pressable>
        )}
      </View>

      <QueueBanner />

      <View className="flex-row gap-2.5 mt-4">
        <Card className="flex-1 p-[15px]">
          <MonoLabel>{t('hantar_ke_kerani')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[34px]"
              style={{ color: submission.pct >= 100 ? C.pass : submission.pct >= 80 ? C.warn : C.fail }}
            >
              {submission.pct}
            </Text>
            <Text className="font-mono text-[15px] text-ink-6">%</Text>
          </View>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">
            {t('before_friday_stat', { onTime: submission.onTime, received: submission.received })}
          </Text>
        </Card>
        <Card className="flex-1 p-[15px]">
          <MonoLabel>{t('lebih_2_bulan')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[34px]"
              style={{ color: aged.length ? C.fail : C.pass }}
            >
              {aged.length}
            </Text>
            <Text className="font-mono text-[13px] text-ink-6">{t('bil')}</Text>
          </View>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">
            {t('tertua_n_hari', { days: oldest })}
          </Text>
        </Card>
      </View>

      {aged.length > 0 && (
        <View
          className="mt-2.5 rounded-[13px] px-[15px] py-3.5 border"
          style={{ backgroundColor: C.failBg, borderColor: C.fail }}
        >
          <Text className="font-sans-semi text-[13px]" style={{ color: C.fail }}>
            {t('n_bil_melebihi', { count: aged.length })}
          </Text>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-2 mt-1.5">
            {overdue.length > 0
              ? t('aged_overdue_detail', { count: overdue.length })
              : t('aged_breach_detail')}
          </Text>
        </View>
      )}

      <View className="flex-row gap-2 mt-2.5">
        <Pressable
          onPress={() => router.push('/pulangan-recon')}
          accessibilityRole="button"
          className="flex-1 py-3 rounded-xl border border-line bg-card items-center active:opacity-70"
        >
          <Text className="font-sans-semi text-[13px] text-ink-2">{t('banding_sistem_stok')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/pulangan-csv')}
          accessibilityRole="button"
          className="flex-1 py-3 rounded-xl border border-line bg-card items-center active:opacity-70"
        >
          <Text className="font-sans-semi text-[13px] text-ink-2">{t('export_csv')}</Text>
        </Pressable>
      </View>

      <Text className="font-sans-semi text-[13.5px] text-ink mt-5 mb-2.5">
        {t('tindakan_anda_count', { count: mine.length })}
      </Text>
      {mine.length === 0 ? (
        <Card className="p-4 items-center">
          <Text className="font-sans-med text-[12.5px] text-ink-4">
            {t('tiada_bil_tindakan')}
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          {mine.map((r) => (
            <ReturnRow key={r.id} record={r} mine={myOwner} />
          ))}
        </View>
      )}

      {others.length > 0 && (
        <>
          <Text className="font-sans-semi text-[13.5px] text-ink mt-5 mb-2.5">
            {t('menunggu_pihak_lain', { count: others.length })}
          </Text>
          <View className="gap-2">
            {others.map((r) => (
              <ReturnRow key={r.id} record={r} mine={myOwner} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
