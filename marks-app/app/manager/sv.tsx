import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card, MonoLabel } from '@/components/Card';
import { QueueBanner } from '@/components/QueueBanner';
import { Screen } from '@/components/Screen';
import { ACTIVE_WEEK } from '@/data/checklist';
import { currentPeriod, weekRangeLabel } from '@/data/period';
import { roleLabel } from '@/i18n/labels';
import { useBranchLabel } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { formKeyForRole, useMarks, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { markingQueue, useUsers } from '@/store/useUsers';
import { pctBg, pctColor } from '@/theme/scoring';

/**
 * The Area Manager's own marking round: the SV/AS at each outlet they cover.
 *
 * A separate screen from the dashboard because it is a different job — the
 * dashboard is for watching, this is for filling in. It reads the same marking
 * queue the supervisors' own screen does, one rung up the relation.
 */
export default function ManagerSvQueue() {
  const submitted = useMarks((s) => s.submitted);
  const passThreshold = useMarks((s) => s.passThreshold);
  const startMarking = useMarks((s) => s.startMarking);
  const users = useUsers((s) => s.users);
  const manager = currentUser(users, useSession((s) => s.currentUserId));
  const branchLabel = useBranchLabel();
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const crew = markingQueue(users, manager);
  const pending = crew.filter((p) => weekMark(p, ACTIVE_WEEK, submitted) == null);

  return (
    <Screen>
      <MonoLabel>
        {manager?.name ?? '—'} · {manager ? roleLabel(manager.role, locale) : ''}
      </MonoLabel>
      <Text className="font-sans-semi text-2xl text-ink mt-2">
        {t('checklist_sv_minggu', { week: ACTIVE_WEEK + 1 })}
      </Text>
      <Text className="font-sans text-[13.5px] leading-5 text-ink-4 mt-2">
        {t('checklist_sv_status', {
          range: weekRangeLabel(currentPeriod(), ACTIVE_WEEK + 1),
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
            const v = weekMark(p, ACTIVE_WEEK, submitted);
            return (
              <Pressable
                key={p.id}
                onPress={() => {
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
                  </Text>
                </View>
                {v == null ? (
                  <View className="px-3 py-2 rounded-lg bg-ink">
                    <Text className="font-sans-semi text-[12px] text-white">{t('isi')}</Text>
                  </View>
                ) : (
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
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
