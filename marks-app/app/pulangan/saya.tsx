import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { STAGE_LABEL, ownerForRole, submissionStats } from '@/data/returns';
import { stageKpi } from '@/data/stageKpi';
import { ROLE_LABEL, isMarked } from '@/data/users';
import { useBranchLabel } from '@/store/useBranches';
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
            Skrin ini untuk pekerja stor dan kerani stor.
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
            {me.id} · {ROLE_LABEL[me.role]} · {branchLabel(me.branchId)}
          </Text>
        </View>
      </View>

      <Text className="font-sans text-[13px] leading-5 text-ink-4 mt-3.5">
        {marked
          ? 'Anda dinilai atas checklist mingguan dan atas pulangan yang anda uruskan.'
          : 'Anda dinilai atas pulangan yang anda uruskan — tiada checklist mingguan.'}
      </Text>

      {/* ------------------------------------------- the returns half ---- */}
      <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-5 mb-2">
        Pulangan · bahagian anda
      </Text>

      <View className="flex-row gap-2.5">
        <Card className="flex-1 p-[15px]">
          <MonoLabel>Menunggu anda</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[30px]"
              style={{ color: kpi!.waitingAged > 0 ? C.fail : kpi!.waiting > 0 ? C.warn : C.pass }}
            >
              {kpi!.waiting}
            </Text>
            <Text className="font-mono text-[13px] text-ink-6">bil</Text>
          </View>
          <Text className="font-sans text-[11.5px] leading-4 text-ink-4 mt-[7px]">
            {kpi!.waitingAged > 0
              ? `${kpi!.waitingAged} sudah lebih 2 bulan`
              : kpi!.waiting > 0
                ? `tertua ${kpi!.oldestWaitingDays} hari`
                : 'tiada tertunggak'}
          </Text>
        </Card>

        <Card className="flex-1 p-[15px]">
          <MonoLabel>Purata tindakan</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[30px]"
              style={{ color: kpi!.avgHandoverDays == null ? C.ink6 : C.ink }}
            >
              {kpi!.avgHandoverDays ?? '—'}
            </Text>
            {kpi!.avgHandoverDays != null && (
              <Text className="font-mono text-[13px] text-ink-6">hari</Text>
            )}
          </View>
          <Text className="font-sans text-[11.5px] leading-4 text-ink-4 mt-[7px]">
            {kpi!.stamped} langkah direkod
          </Text>
        </Card>
      </View>

      {/* Rule 1 is the store's own: handing the list over before Friday. */}
      {owner === 'store' && submission.received > 0 && (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>Hantar senarai ke kerani</MonoLabel>
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
            {submission.onTime}/{submission.received} sebelum Jumaat
            {submission.missing > 0 ? ` · ${submission.missing} tak hantar` : ''}
          </Text>
        </Card>
      )}

      {kpi!.hops.length > 0 && (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>Masa setiap langkah anda</MonoLabel>
          <View className="gap-2.5 mt-3">
            {kpi!.hops.map((h) => (
              <View key={`${h.from}-${h.to}`} className="flex-row items-center gap-3">
                <View className="flex-1 min-w-0">
                  <Text className="font-sans-med text-[12.5px] text-ink-2" numberOfLines={2}>
                    {STAGE_LABEL[h.to]}
                  </Text>
                  <Text className="font-mono text-[10px] text-ink-6 mt-0.5">
                    selepas {STAGE_LABEL[h.from].toLowerCase()} · n={h.n}
                  </Text>
                </View>
                {h.outOfOrder ? (
                  <Text
                    className="font-mono-med text-[9.5px] uppercase tracking-label text-right"
                    style={{ color: C.warn, maxWidth: 74 }}
                  >
                    tarikh tak tertib
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
            Checklist mingguan
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
                {weeks.length} minggu direkod
                {latest.verified ? ' · disahkan MGR' : ' · belum disahkan'}
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
                Belum ada markah checklist direkod untuk anda.
              </Text>
            </Card>
          )}
        </>
      )}

      <SignOutButton />
    </Screen>
  );
}
