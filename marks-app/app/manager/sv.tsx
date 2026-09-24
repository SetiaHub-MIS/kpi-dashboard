import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card, MonoLabel } from '@/components/Card';
import { PeriodPicker } from '@/components/PeriodPicker';
import { QueueBanner } from '@/components/QueueBanner';
import { Screen } from '@/components/Screen';
import { PERIODS } from '@/data/checklist';
import { weekRangeLabel } from '@/data/period';
import { roleLabel, supervisorTitleLabel } from '@/i18n/labels';
import { notify } from '@/lib/dialog';
import { useBranchLabel } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { formKeyForRole, isVerified, useMarks, weekKey, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { markingQueue, useUsers } from '@/store/useUsers';
import { C, pctBg, pctColor } from '@/theme/scoring';

/**
 * The Area Manager's own marking round: the SV/AS at each outlet they cover.
 *
 * A separate screen from the dashboard because it is a different job — the
 * dashboard is for watching, this is for filling in. It reads the same marking
 * queue the supervisors' own screen does, one rung up the relation, and the
 * same month and week selection.
 */
export default function ManagerSvQueue() {
  const submitted = useMarks((s) => s.submitted);
  const verified = useMarks((s) => s.verified);
  const monthIdx = useMarks((s) => s.monthIdx);
  const weekIdx = useMarks((s) => s.weekIdx);
  const passThreshold = useMarks((s) => s.passThreshold);
  const startMarking = useMarks((s) => s.startMarking);
  const users = useUsers((s) => s.users);
  const manager = currentUser(users, useSession((s) => s.currentUserId));
  const branchLabel = useBranchLabel();
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const crew = markingQueue(users, manager);
  const pending = crew.filter((p) => weekMark(p, weekIdx, submitted) == null);

  return (
    <Screen>
      <MonoLabel>
        {manager?.name ?? '—'} · {manager ? roleLabel(manager.role, locale) : ''} · {t('tab_checklist_sv')}
      </MonoLabel>
      <View className="mt-2">
        <PeriodPicker weeks />
      </View>
      <Text className="font-sans text-[13.5px] leading-5 text-ink-4 mt-3">
        {t('checklist_sv_status', {
          week: weekIdx + 1,
          range: weekRangeLabel(PERIODS[monthIdx], weekIdx + 1),
          pending: pending.length,
          total: crew.length,
        })}
      </Text>

      <QueueBanner />

      {crew.length === 0 ? (
        <Card className="p-4 mt-4 items-center">
          <Text className="font-sans-med text-[12.5px] text-ink-4">
            {t('tiada_sv_cawangan')}
          </Text>
        </Card>
      ) : (
        <View className="gap-2 mt-[18px]">
          {crew.map((p) => {
            const v = weekMark(p, weekIdx, submitted);
            const locked = v != null && isVerified(weekKey(p.id, weekIdx), verified);
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  if (locked) {
                    notify(t('markah_dikunci_title'), t('markah_dikunci'));
                    return;
                  }
                  startMarking(p.id, formKeyForRole(p.role));
                  router.push(`/mark/${p.id}`);
                }}
                accessibilityRole="button"
                className="bg-card border border-line rounded-xl px-3.5 py-3 flex-row items-center gap-3 active:opacity-70"
              >
                <Avatar init={p.init} size={34} />
                <View className="flex-1 min-w-0">
                  <Text className="font-sans-semi text-[13.5px] text-ink" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text className="font-mono text-[10.5px] text-ink-5 mt-1">
                    {p.id} · {branchLabel(p.branchId)}
                    {p.supervisorTitle ? ` · ${supervisorTitleLabel(p.supervisorTitle, locale)}` : ''}
                    {v != null && !locked ? ` · ${t('boleh_diubah')}` : ''}
                  </Text>
                </View>
                {v == null ? (
                  <View className="px-3 py-2 rounded-lg bg-ink">
                    <Text className="font-sans-semi text-[12px] text-white">{t('isi')}</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-1.5">
                    {locked && (
                      <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: C.passBg }}>
                        <Text className="font-mono-semi text-[9px]" style={{ color: C.pass }}>
                          MGR
                        </Text>
                      </View>
                    )}
                    <View
                      className="px-2.5 py-[9px] rounded-[9px]"
                      style={{ backgroundColor: pctBg(v, passThreshold) }}
                    >
                      <Text
                        className="font-mono-semi text-[14px]"
                        style={{ color: pctColor(v, passThreshold) }}
                      >
                        {v}%
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
