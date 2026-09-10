import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { PerkaraBars } from '@/components/PerkaraBars';
import { Screen } from '@/components/Screen';
import { ACTIVE_WEEK, FORM, MONTHS, PERIODS, STOR_FORM, SV_FORM, WEEK_COLS } from '@/data/checklist';
import { exportMonthXlsx } from '@/lib/export';
import { assetsOfBranch, useAssets } from '@/store/useAssets';
import { useBranchLabel } from '@/store/useBranches';
import { branchesOf } from '@/data/users';
import { roleLabel } from '@/i18n/labels';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { markingQueue, useUsers, visibleStaff } from '@/store/useUsers';
import { TUGASAN_ITEMS, tugasanScope } from '@/data/tugasan';
import {
  isVerified,
  monthStats,
  perkaraAverages,
  useMarks,
  weekMark,
} from '@/store/useMarks';
import { tugasanDoneCount, useTugasan } from '@/store/useTugasan';
import { C, pctBg, pctColor } from '@/theme/scoring';

export default function ManagerHome() {
  const { monthIdx, submitted, verified, passThreshold, verifyByManager } = useMarks();
  const prevMonth = useMarks((s) => s.prevMonth);
  const nextMonth = useMarks((s) => s.nextMonth);
  const [exporting, setExporting] = useState(false);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const runExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportMonthXlsx(PERIODS[monthIdx]);
      // The OS share sheet is its own confirmation. Without it — no app on
      // this phone registered to receive a share — silence would look
      // exactly like nothing having happened at all, so this says so
      // explicitly and names where the file actually landed.
      if (!result.shared) {
        Alert.alert(
          t('fail_sedia_tiada_kongsi'),
          t('fail_sedia_detail', { filename: result.filename, uri: result.uri })
        );
      }
    } catch (e: any) {
      Alert.alert(t('eksport_gagal'), e?.message ?? t('cuba_lagi_sebentar'));
    } finally {
      setExporting(false);
    }
  };

  const users = useUsers((s) => s.users);
  const manager = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = manager?.branchId ?? null;
  const crew = visibleStaff(users, manager);
  const branchLabel = useBranchLabel();
  // An Area Manager can cover more than one outlet, so the header names them
  // all rather than only the home posting.
  const covered = manager ? branchesOf(manager) : [];
  const scopeLabel =
    covered.length > 1 ? covered.map(branchLabel).join(' · ') : branchLabel(branchId);

  const stats = monthStats(crew, submitted);
  const gapHeavy = stats.gaps > stats.cellTotal * 0.3;
  const assetRows = useAssets((s) => s.rows);
  const openAssets = assetsOfBranch(assetRows, branchId).filter((a) => a.isOpen);
  const oldestAssetDays = openAssets.reduce((max, a) => {
    if (!a.openedOn) return max;
    const days = Math.max(0, Math.round((Date.now() - Date.parse(a.openedOn)) / 86_400_000));
    return Math.max(max, days);
  }, 0);

  // Each role is scored on its own form, so their kategori averages are
  // reported side by side rather than blended into one meaningless number.
  const cohorts = [
    { key: 'kedai' as const, label: t('cohort_kedai'), form: FORM, people: crew.filter((p) => p.role === 'staff') },
    { key: 'stor' as const, label: t('cohort_stor'), form: STOR_FORM, people: crew.filter((p) => p.role === 'store') },
    { key: 'sv' as const, label: t('cohort_sv'), form: SV_FORM, people: crew.filter((p) => p.role === 'supervisor') },
  ].filter((c) => c.people.length > 0);

  // The Area Manager's own marking round: the supervisors at the outlets they
  // cover. The workbook has them doing this, and nobody else could.
  const myQueue = markingQueue(users, manager);
  const svPending = myQueue.filter((p) => weekMark(p, ACTIVE_WEEK, submitted) == null);

  const tugasanEntriesByMonth = useTugasan((s) => s.entriesByMonth);
  const tugasanTotal = WEEK_COLS.length * TUGASAN_ITEMS.length;
  const tugasanDone = WEEK_COLS.reduce(
    (n, _, i) => n + tugasanDoneCount(tugasanEntriesByMonth, tugasanScope(branchId, monthIdx), i),
    0
  );

  return (
    <Screen>
      <MonoLabel>
        {manager?.name ?? t('tiada_area_manager')} ·{' '}
          {manager ? roleLabel(manager.role, locale) : roleLabel('area_manager', locale)} · {scopeLabel}
      </MonoLabel>

      <View className="flex-row items-center justify-between mt-2">
        <Text className="font-sans-semi text-2xl text-ink">{MONTHS[monthIdx]}</Text>
        <View className="flex-row gap-1.5">
          <StepButton label="‹" onPress={prevMonth} disabled={monthIdx === 0} />
          <StepButton
            label="›"
            onPress={nextMonth}
            disabled={monthIdx === MONTHS.length - 1}
          />
        </View>
      </View>

      <View className="flex-row gap-2.5 mt-4">
        <Card className="flex-1 p-[15px]">
          <MonoLabel>{t('purata_sv')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[34px]"
              style={{ color: pctColor(stats.avg, passThreshold) }}
            >
              {stats.avg}
            </Text>
            <Text className="font-mono text-[15px] text-ink-6">%</Text>
          </View>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">
            {t('n_penilaian_direkod', { count: stats.marked })}
          </Text>
        </Card>

        <Pressable
          onPress={() => router.push('/manager/gaps')}
          accessibilityRole="button"
          className="flex-1 bg-card rounded-[13px] p-[15px] border active:opacity-70"
          style={{ borderColor: gapHeavy ? C.warnLine : C.line }}
        >
          <MonoLabel>{t('belum_dinilai')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[34px]"
              style={{ color: gapHeavy ? C.warn : C.ink }}
            >
              {stats.gaps}
            </Text>
            <Text className="font-mono text-[13px] text-ink-6">/ {stats.cellTotal}</Text>
          </View>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">{t('minggu_x_pekerja')}</Text>
        </Pressable>
      </View>

      <Card className="p-[15px] mt-2.5">
        <View className="flex-row items-baseline justify-between mb-3">
          <Text className="font-sans-semi text-[13px] text-ink">{t('markah_mingguan')}</Text>
          <Text className="font-mono text-[10.5px] text-ink-6">
            {verifyByManager ? t('hijau_disahkan_mgr') : t('peratus_mingguan')}
          </Text>
        </View>

        <View className="flex-row gap-1 mb-1.5" style={{ paddingLeft: 100 }}>
          {WEEK_COLS.map((w) => (
            <Text
              key={w}
              className="flex-1 text-center font-mono-med text-[10px] text-ink-5"
            >
              {w}
            </Text>
          ))}
        </View>

        <View className="gap-1">
          {cohorts.map((cohort) => (
            <View key={cohort.key} className="gap-1">
              {cohorts.length > 1 && (
                <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-6 mt-1.5 mb-0.5">
                  {cohort.label}
                </Text>
              )}
              {cohort.people.map((p) => (
            <View key={p.id} className="flex-row gap-1 items-center">
              <Pressable
                onPress={() => router.push(`/person/${p.id}`)}
                style={{ width: 100 }}
                accessibilityRole="button"
              >
                <Text
                  className="font-sans-med text-[11.5px] text-ink-2"
                  numberOfLines={1}
                >
                  {p.short}
                </Text>
              </Pressable>
              {p.w.map((_, i) => {
                const v = weekMark(p, i, submitted);
                const ok = isVerified(`${p.id}-${i}`, verified) && verifyByManager;
                return (
                  <Pressable
                    key={i}
                    onPress={() => router.push(`/person/${p.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      v == null
                        ? t('cell_a11y_unmarked', { name: p.short, week: i + 1 })
                        : t('cell_a11y_marked', { name: p.short, week: i + 1, value: v })
                    }
                    className="flex-1 h-[30px] rounded-md items-center justify-center"
                    style={
                      v == null
                        ? {
                            borderWidth: 1,
                            borderStyle: 'dashed',
                            borderColor: '#D6D6D2',
                            backgroundColor: '#FAFAF9',
                          }
                        : {
                            borderWidth: ok ? 1.5 : 1,
                            borderColor: ok ? C.pass : 'transparent',
                            backgroundColor: pctBg(v, passThreshold),
                          }
                    }
                  >
                    <Text
                      className={v == null ? 'font-mono-med text-[11px]' : 'font-mono-semi text-[11.5px]'}
                      style={{ color: v == null ? C.ink7 : pctColor(v, passThreshold) }}
                    >
                      {v == null ? '–' : v}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
              ))}
            </View>
          ))}
        </View>
      </Card>

      {cohorts.map((cohort) => {
        const averages = perkaraAverages(cohort.people, cohort.form);
        const lowest = cohort.form[averages.indexOf(Math.min(...averages))].name;
        return (
          <Card key={cohort.key} className="p-4 mt-2.5">
            <View className="flex-row items-baseline justify-between mb-4">
              <Text className="font-sans-semi text-[13px] text-ink">{t('markah_ikut_perkara')}</Text>
              <Text className="font-mono text-[10.5px] text-ink-6">{cohort.label}</Text>
            </View>
            <PerkaraBars values={averages} form={cohort.form} />
            <Text className="font-sans text-xs leading-[17px] text-ink-4 mt-4 pt-3 border-t border-rule">
              {t('lowest_perkara_summary', {
                item: lowest,
                count: cohort.people.length,
                cohort: cohort.label.toLowerCase(),
              })}
            </Text>
          </Card>
        );
      })}

      {myQueue.length > 0 && (
        <Pressable
          onPress={() => router.push('/manager/sv')}
          accessibilityRole="button"
          className="mt-2.5 py-3 rounded-xl border items-center active:opacity-70"
          style={{
            borderColor: svPending.length > 0 ? C.warnLine : C.line,
            backgroundColor: svPending.length > 0 ? C.warnCard : C.card,
          }}
        >
          <Text className="font-sans-semi text-[13px] text-ink-2">
            {t('checklist_sv_banner', { pending: svPending.length, total: myQueue.length })}
          </Text>
        </Pressable>
      )}

      {openAssets.length > 0 && (
        <Pressable
          onPress={() => router.push('/manager/assets')}
          accessibilityRole="button"
          className="mt-2.5 rounded-[13px] px-[15px] py-3.5 flex-row gap-3 items-center border active:opacity-70"
          style={{ backgroundColor: C.warnCard, borderColor: C.warnLine }}
        >
          <View
            className="w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: C.warn }}
          />
          <Text
            className="flex-1 font-sans-med text-[13px] leading-[18px]"
            style={{ color: C.warnInk }}
          >
            {t('checklist_kedai_banner', { count: openAssets.length, days: oldestAssetDays })}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push('/manager/tugasan')}
        accessibilityRole="button"
        className="mt-2.5 bg-card border border-line rounded-[13px] px-[15px] py-3.5 flex-row gap-3 items-center active:opacity-70"
      >
        <View
          className="w-[7px] h-[7px] rounded-full"
          style={{ backgroundColor: tugasanDone === tugasanTotal ? C.pass : C.ink7 }}
        />
        <Text className="flex-1 font-sans-med text-[13px] leading-[18px] text-ink-2">
          {t('tugasan_am_banner', { done: tugasanDone, total: tugasanTotal })}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => void runExport()}
        disabled={exporting}
        accessibilityRole="button"
        className="mt-2.5 py-3.5 rounded-xl border border-[#D6D6D2] bg-card items-center active:opacity-70"
        style={{ opacity: exporting ? 0.6 : 1 }}
      >
        <Text className="font-sans-semi text-sm text-ink-2">
          {exporting ? t('menjana_fail') : t('export_month_xlsx', { month: MONTHS[monthIdx] })}
        </Text>
      </Pressable>
    </Screen>
  );
}

function StepButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className="w-[34px] h-[34px] rounded-[9px] border border-line bg-card items-center justify-center active:opacity-60"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Text className="font-mono-med text-sm text-ink-3">{label}</Text>
    </Pressable>
  );
}
