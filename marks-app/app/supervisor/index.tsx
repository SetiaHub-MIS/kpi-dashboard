import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { PeriodPicker } from '@/components/PeriodPicker';
import { QueueBanner } from '@/components/QueueBanner';
import { MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { PERIODS } from '@/data/checklist';
import { weekRangeLabel } from '@/data/period';
import { notify } from '@/lib/dialog';
import { useBranchLabel } from '@/store/useBranches';
import { User } from '@/data/users';
import { roleLabel } from '@/i18n/labels';
import { formKeyForRole, isVerified, useMarks, weekKey, weekMark } from '@/store/useMarks';
import { useLocale, useT } from '@/store/useLocale';
import { unreadReminders, useReminders } from '@/store/useReminders';
import { currentUser, useSession } from '@/store/useSession';
import { markingQueue, useUsers } from '@/store/useUsers';
import { C, pctBg, pctColor } from '@/theme/scoring';

export default function SupervisorQueue() {
  const submitted = useMarks((s) => s.submitted);
  const verified = useMarks((s) => s.verified);
  const monthIdx = useMarks((s) => s.monthIdx);
  const weekIdx = useMarks((s) => s.weekIdx);
  const passThreshold = useMarks((s) => s.passThreshold);
  const startMarking = useMarks((s) => s.startMarking);
  const users = useUsers((s) => s.users);
  const unread = unreadReminders(useReminders((s) => s.items));
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const supervisor = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = supervisor?.branchId ?? null;
  // Who this SV/AS marks — not everyone measurable at the branch, which
  // would now include themselves and their peers.
  const crew = markingQueue(users, supervisor);
  const branchLabel = useBranchLabel();
  const pending = crew.filter((p) => weekMark(p, weekIdx, submitted) == null);

  const open = (person: User) => {
    if (isVerified(weekKey(person.id, weekIdx), verified)) {
      notify(t('markah_dikunci_title'), t('markah_dikunci'));
      return;
    }
    startMarking(person.id, formKeyForRole(person.role));
    router.push(`/mark/${person.id}`);
  };

  return (
    <Screen>
      <MonoLabel>
        {supervisor?.name ?? t('tiada_sv')} · {roleLabel('supervisor', locale)} · {branchLabel(branchId)}
      </MonoLabel>
      <View className="mt-2">
        <PeriodPicker weeks />
      </View>
      <Text className="font-sans text-[13.5px] leading-5 text-ink-4 mt-3">
        {t('checklist_status', {
          week: weekIdx + 1,
          range: weekRangeLabel(PERIODS[monthIdx], weekIdx + 1),
          pending: pending.length,
          total: crew.length,
        })}
      </Text>

      <QueueBanner />

      {unread.length > 0 && (
        <Pressable
          onPress={() => router.push('/supervisor/peringatan')}
          accessibilityRole="button"
          className="mt-3 rounded-[10px] px-3.5 py-3 border active:opacity-70"
          style={{ backgroundColor: C.warnCard, borderColor: C.warnLine }}
        >
          <Text
            className="font-sans-med text-[12.5px] leading-[19px]"
            style={{ color: C.warnInk }}
          >
            {t('peringatan_am_banner', { count: unread.length })}
          </Text>
        </Pressable>
      )}

      <View className="gap-2 mt-[18px]">
        {crew.map((p) => {
          const v = weekMark(p, weekIdx, submitted);
          const done = v != null;
          const locked = done && isVerified(weekKey(p.id, weekIdx), verified);
          return (
            <Pressable
              key={p.id}
              onPress={() => open(p)}
              accessibilityRole="button"
              accessibilityLabel={
                locked
                  ? t('row_a11y_locked', { name: p.name, value: v })
                  : done
                    ? t('row_a11y_marked', { name: p.name, value: v })
                    : t('row_a11y_unmarked', { name: p.name })
              }
              className="bg-card border border-line rounded-xl px-3.5 py-3 active:opacity-70"
              style={{ opacity: done ? 0.6 : 1 }}
            >
              <View className="flex-row items-center gap-3">
                <Avatar init={p.init} />
                <View className="flex-1 min-w-0">
                  <Text className="font-sans-semi text-[13.5px] text-ink">{p.name}</Text>
                  <Text className="font-mono text-[11px] text-ink-5 mt-1">
                    {p.id} · {p.role === 'store' ? t('badge_stor') : t('badge_kedai')}
                    {done && !locked ? ` · ${t('boleh_diubah')}` : ''}
                  </Text>
                </View>
                {done ? (
                  <View className="flex-row items-center gap-1.5">
                    {locked && (
                      <View
                        className="px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: C.passBg }}
                      >
                        <Text className="font-mono-semi text-[9px]" style={{ color: C.pass }}>
                          MGR
                        </Text>
                      </View>
                    )}
                    <View
                      className="px-2.5 py-[7px] rounded-lg"
                      style={{ backgroundColor: pctBg(v, passThreshold) }}
                    >
                      <Text
                        className="font-mono-semi text-[12.5px]"
                        style={{ color: pctColor(v, passThreshold) }}
                      >
                        {v}%
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="px-[11px] py-[7px] rounded-lg bg-ink">
                    <Text className="font-sans-semi text-xs text-white">{t('isi')}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
