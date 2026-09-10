import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ownerForRole, submissionStats } from '@/data/returns';
import { stageKpi } from '@/data/stageKpi';
import { isMarked } from '@/data/users';
import { roleLabel, stageLabel } from '@/i18n/labels';
import { useBranchLabel } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { useMarks } from '@/store/useMarks';
import { useMyWeeks } from '@/store/useMyWeeks';
import { returnsVisibleTo, useReturns } from '@/store/useReturns';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C, pctColor } from '@/theme/scoring';
import { SignOutButton } from '@/components/SignOutButton';

/**
 * How the stor roles are measured, shown to the person being measured.
 *
 * Kerani stor have no checklist — their ruling was that the returns they move
 * *are* their KPI — so this screen is their whole appraisal. Pekerja stor have
 * both, and get the checklist half as well.
 */
export default function PulanganSaya() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const records = useReturns((s) => s.records);
  const branchLabel = useBranchLabel();
  const passThreshold = useMarks((s) => s.passThreshold);
  const scaleMax = useMarks((s) => s.scaleMax);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const weeks = useMyWeeks((s) => s.weeks);
  const loadWeeks = useMyWeeks((s) => s.load);
  const marked = me ? isMarked(me.role) : false;

  useEffect(() => {
    if (me && marked) void loadWeeks(me.id, scaleMax);
  }, [me, marked, scaleMax, loadWeeks]);

  const owner = ownerForRole(me?.role);
  const visible = returnsVisibleTo(records, me);
  const kpi = owner ? stageKpi(visible, owner, new Date().toISOString().slice(0, 10)) : null;
  const submission = submissionStats(visible);
  const latest = weeks[0];

  if (!me || !owner) {
    return (
      <Screen>
        <Card className="p-4 mt-4">
          <Text className="font-sans-med text-[13px] text-ink-3">
            {t('skrin_stor_kerani')}
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-row items-center gap-3">
        <Avatar init={me.init} size={40} />
        <View className="flex-1 min-w-0">
          <Text className="font-sans-semi text-[17px] text-ink">{me.name}</Text>
          <Text className="font-mono text-[11px] text-ink-5 mt-1">
            {me.id} · {roleLabel(me.role, locale)} · {branchLabel(me.branchId)}
          </Text>
        </View>
      </View>

      <Text className="font-sans text-[13px] leading-5 text-ink-4 mt-3.5">
        {marked ? t('dinilai_checklist_dan_pulangan') : t('dinilai_pulangan_sahaja')}
      </Text>

      {/* ------------------------------------------- the returns half ---- */}
      <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-5 mb-2">
        {t('pulangan_bahagian_anda')}
      </Text>

      <View className="flex-row gap-2.5">
        <Card className="flex-1 p-[15px]">
          <MonoLabel>{t('menunggu_anda')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[30px]"
              style={{ color: kpi!.waitingAged > 0 ? C.fail : kpi!.waiting > 0 ? C.warn : C.pass }}
            >
              {kpi!.waiting}
            </Text>
            <Text className="font-mono text-[13px] text-ink-6">{t('bil')}</Text>
          </View>
          <Text className="font-sans text-[11.5px] leading-4 text-ink-4 mt-[7px]">
            {kpi!.waitingAged > 0
              ? t('n_sudah_2_bulan', { count: kpi!.waitingAged })
              : kpi!.waiting > 0
                ? t('tertua_n_hari', { days: kpi!.oldestWaitingDays })
                : t('tiada_tertunggak')}
          </Text>
        </Card>

        <Card className="flex-1 p-[15px]">
          <MonoLabel>{t('purata_tindakan')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[30px]"
              style={{ color: kpi!.avgHandoverDays == null ? C.ink6 : C.ink }}
            >
              {kpi!.avgHandoverDays ?? '—'}
            </Text>
            {kpi!.avgHandoverDays != null && (
              <Text className="font-mono text-[13px] text-ink-6">{t('hari')}</Text>
            )}
          </View>
          <Text className="font-sans text-[11.5px] leading-4 text-ink-4 mt-[7px]">
            {t('n_langkah_direkod', { count: kpi!.stamped })}
          </Text>
        </Card>
      </View>

      {/* Rule 1 is the store's own: handing the list over before Friday. */}
      {owner === 'store' && submission.received > 0 && (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('hantar_senarai_kerani')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[30px]"
              style={{ color: pctColor(submission.pct, 100) }}
            >
              {submission.pct}
            </Text>
            <Text className="font-mono text-[14px] text-ink-6">%</Text>
          </View>
          <Text className="font-sans text-[11.5px] leading-4 text-ink-4 mt-[7px]">
            {t('before_friday_stat', { onTime: submission.onTime, received: submission.received })}
            {submission.missing > 0 ? t('tak_hantar_suffix', { count: submission.missing }) : ''}
          </Text>
        </Card>
      )}

      {kpi!.hops.length > 0 && (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('masa_langkah_anda')}</MonoLabel>
          <View className="gap-2.5 mt-3">
            {kpi!.hops.map((h) => (
              <View key={`${h.from}-${h.to}`} className="flex-row items-center gap-3">
                <View className="flex-1 min-w-0">
                  <Text className="font-sans-med text-[12.5px] text-ink-2" numberOfLines={2}>
                    {stageLabel(h.to, locale)}
                  </Text>
                  <Text className="font-mono text-[10px] text-ink-6 mt-0.5">
                    {t('selepas_stage_n', { stage: stageLabel(h.from, locale).toLowerCase(), n: h.n })}
                  </Text>
                </View>
                {h.outOfOrder ? (
                  <Text
                    className="font-mono-med text-[9.5px] uppercase tracking-label text-right"
                    style={{ color: C.warn, maxWidth: 74 }}
                  >
                    {t('tarikh_tak_tertib')}
                  </Text>
                ) : (
                  <Text
                    className="font-mono-semi text-[15px]"
                    style={{ color: h.avgDays > 7 ? C.fail : h.avgDays > 3 ? C.warn : C.ink }}
                  >
                    {h.avgDays}h
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* ----------------------------------------- the checklist half ---- */}
      {marked && (
        <>
          <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-6 mb-2">
            {t('checklist_mingguan_label')}
          </Text>
          {latest ? (
            <Card className="p-[15px]">
              <MonoLabel>{latest.label}</MonoLabel>
              <View className="flex-row items-baseline gap-1 mt-2.5">
                <Text
                  className="font-mono-semi text-[30px]"
                  style={{ color: pctColor(latest.pct, passThreshold) }}
                >
                  {latest.pct}
                </Text>
                <Text className="font-mono text-[14px] text-ink-6">
                  % · {latest.total}/{latest.maxScore}
                </Text>
              </View>
              <Text className="font-sans text-[11.5px] leading-4 text-ink-4 mt-[7px]">
                {t('n_minggu_direkod', { count: weeks.length })}
                {latest.verified ? t('disahkan_mgr_suffix') : t('belum_disahkan_suffix')}
              </Text>
              {latest.note !== '' && (
                <Text className="font-sans text-[12.5px] leading-[19px] text-ink-3 mt-3 pt-3 border-t border-rule">
                  {latest.note}
                </Text>
              )}
            </Card>
          ) : (
            <Card className="p-4">
              <Text className="font-sans-med text-[12.5px] text-ink-4">
                {t('belum_ada_markah_checklist')}
              </Text>
            </Card>
          )}
        </>
      )}

      <SignOutButton />
    </Screen>
  );
}
