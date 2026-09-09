import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { PerkaraBars } from '@/components/PerkaraBars';
import { Screen } from '@/components/Screen';
import { FORM, MONTHS, STOR_FORM, WEEK_COLS } from '@/data/checklist';
import { assetsOfBranch } from '@/data/assets';
import { useBranchLabel } from '@/store/useBranches';
import { ROLE_LABEL, branchesOf } from '@/data/users';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers, visibleStaff } from '@/store/useUsers';
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
  const openAssets = assetsOfBranch(branchId).filter((a) => a.open);

  // Kedai and stor are scored on different forms, so their kategori averages
  // are reported side by side rather than blended into one meaningless number.
  const cohorts = [
    { key: 'kedai' as const, label: 'Pekerja Kedai', form: FORM, people: crew.filter((p) => p.role === 'staff') },
    { key: 'stor' as const, label: 'Pekerja Stor', form: STOR_FORM, people: crew.filter((p) => p.role === 'store') },
  ].filter((c) => c.people.length > 0);

  const tugasanEntriesByMonth = useTugasan((s) => s.entriesByMonth);
  const tugasanTotal = WEEK_COLS.length * TUGASAN_ITEMS.length;
  const tugasanDone = WEEK_COLS.reduce(
    (n, _, i) => n + tugasanDoneCount(tugasanEntriesByMonth, tugasanScope(branchId, monthIdx), i),
    0
  );

  return (
    <Screen>
      <MonoLabel>
        {manager?.name ?? 'Tiada Area Manager'} ·{' '}
          {manager ? ROLE_LABEL[manager.role] : ROLE_LABEL.area_manager} · {scopeLabel}
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
          <MonoLabel>Purata SV/AS</MonoLabel>
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
            {stats.marked} penilaian direkod
          </Text>
        </Card>

        <Pressable
          onPress={() => router.push('/manager/gaps')}
          accessibilityRole="button"
          className="flex-1 bg-card rounded-[13px] p-[15px] border active:opacity-70"
          style={{ borderColor: gapHeavy ? C.warnLine : C.line }}
        >
          <MonoLabel>Belum dinilai</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[34px]"
              style={{ color: gapHeavy ? C.warn : C.ink }}
            >
              {stats.gaps}
            </Text>
            <Text className="font-mono text-[13px] text-ink-6">/ {stats.cellTotal}</Text>
          </View>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">minggu × pekerja</Text>
        </Pressable>
      </View>

      <Card className="p-[15px] mt-2.5">
        <View className="flex-row items-baseline justify-between mb-3">
          <Text className="font-sans-semi text-[13px] text-ink">Markah mingguan</Text>
          <Text className="font-mono text-[10.5px] text-ink-6">
            {verifyByManager ? 'hijau = disahkan MGR' : '% mingguan'}
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
                    accessibilityLabel={`${p.short} minggu ${i + 1}: ${
                      v == null ? 'belum dinilai' : `${v} peratus`
                    }`}
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
              <Text className="font-sans-semi text-[13px] text-ink">Markah ikut perkara</Text>
              <Text className="font-mono text-[10.5px] text-ink-6">{cohort.label}</Text>
            </View>
            <PerkaraBars values={averages} form={cohort.form} />
            <Text className="font-sans text-xs leading-[17px] text-ink-4 mt-4 pt-3 border-t border-rule">
              {lowest} perkara paling rendah bagi {cohort.people.length} {cohort.label.toLowerCase()}.
            </Text>
          </Card>
        );
      })}

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
            Checklist Kedai: {openAssets.length} aset belum selesai, tertua 34 hari →
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
          Tugasan Area Manager: {tugasanDone}/{tugasanTotal} semakan mingguan selesai →
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          Alert.alert(
            `Export ${MONTHS[monthIdx]}`,
            `${stats.marked} penilaian sedia untuk dieksport. ${stats.gaps} kotak masih kosong dan akan keluar sebagai sel kosong, bukan #DIV/0!.`
          )
        }
        accessibilityRole="button"
        className="mt-2.5 py-3.5 rounded-xl border border-[#D6D6D2] bg-card items-center active:opacity-70"
      >
        <Text className="font-sans-semi text-sm text-ink-2">
          Export {MONTHS[monthIdx]} (XLSX)
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
