import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { monthShort } from '@/data/period';
import { markReminderRead } from '@/lib/reminders';
import { ThreadSummary, fetchMyThreads } from '@/lib/queries';
import { useT } from '@/store/useLocale';
import { unreadReminders, useReminders } from '@/store/useReminders';
import { currentUser, useSession } from '@/store/useSession';
import { findUser, useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function Soalan() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const reminders = useReminders((s) => s.items);
  const setRead = useReminders((s) => s.setRead);
  const unread = unreadReminders(reminders);
  const t = useT();

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    fetchMyThreads(me.id)
      .then((rows) => {
        if (!cancelled) setThreads(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  const dismiss = (id: number) => {
    setRead(id, new Date().toISOString());
    void markReminderRead(id).catch(() => {
      // Left read on screen; a retry just means dismissing again next visit.
    });
  };

  const openThread = (thread: ThreadSummary) => {
    const person = findUser(users, thread.userId);
    router.push({
      pathname: '/query/[markId]',
      params: {
        markId: String(thread.markId),
        label: t('soalan_thread_label', {
          week: thread.weekNo,
          month: monthShort({ year: thread.periodYear, month: thread.periodMonth }),
        }),
        otherName: person?.name ?? thread.userId,
      },
    });
  };

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">{t('soalan_peringatan')}</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {t('soalan_peringatan_intro')}
      </Text>

      {unread.length > 0 && (
        <View className="gap-2 mt-[18px]">
          <MonoLabel>{t('peringatan')}</MonoLabel>
          {unread.map((r) => (
            <View
              key={r.id}
              className="rounded-[10px] px-3.5 py-3 border"
              style={{ backgroundColor: C.warnCard, borderColor: C.warnLine }}
            >
              <Text
                className="font-sans-med text-[12.5px] leading-[19px]"
                style={{ color: C.warnInk }}
              >
                {r.message}
              </Text>
              <Pressable
                onPress={() => dismiss(r.id)}
                accessibilityRole="button"
                className="self-start mt-2.5 px-3 py-1.5 rounded-lg border"
                style={{ borderColor: C.warnLine }}
              >
                <Text className="font-sans-med text-[12px]" style={{ color: C.warnInk }}>
                  {t('faham')}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="gap-2 mt-[18px]">
        <MonoLabel>{t('soalan_pekerja')}</MonoLabel>
        {loading ? (
          <Text className="font-sans text-[12.5px] text-ink-5 mt-1">{t('memuatkan')}</Text>
        ) : threads.length === 0 ? (
          <Card className="p-5 items-center">
            <Text className="font-sans-med text-sm text-ink-3">
              {t('tiada_soalan')}
            </Text>
          </Card>
        ) : (
          threads.map((thread) => {
            const person = findUser(users, thread.userId);
            return (
              <Pressable
                key={thread.markId}
                onPress={() => openThread(thread)}
                accessibilityRole="button"
                className="bg-card border border-line rounded-xl px-3.5 py-3 active:opacity-70"
              >
                <View className="flex-row items-baseline justify-between">
                  <Text className="font-sans-semi text-[13.5px] text-ink">
                    {person?.short ?? thread.userId}
                  </Text>
                  <Text className="font-mono text-[10.5px] text-ink-6">
                    {t('minggu_bulan', {
                      week: thread.weekNo,
                      month: monthShort({ year: thread.periodYear, month: thread.periodMonth }),
                    })}
                  </Text>
                </View>
                <Text
                  className="font-sans text-[12px] text-ink-4 mt-1.5"
                  numberOfLines={1}
                >
                  {thread.lastBody}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}
