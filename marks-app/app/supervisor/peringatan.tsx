import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { markReminderRead } from '@/lib/reminders';
import { useT } from '@/store/useLocale';
import { unreadReminders, useReminders } from '@/store/useReminders';
import { C } from '@/theme/scoring';

/** Nudges from the Area Manager about crew still unmarked. Read here, dismissed here. */
export default function Peringatan() {
  const reminders = useReminders((s) => s.items);
  const setRead = useReminders((s) => s.setRead);
  const unread = unreadReminders(reminders);
  const t = useT();

  const dismiss = (id: number) => {
    setRead(id, new Date().toISOString());
    void markReminderRead(id).catch(() => {
      // Left read on screen; a retry just means dismissing again next visit.
    });
  };

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">{t('peringatan')}</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {t('peringatan_intro')}
      </Text>

      {unread.length === 0 ? (
        <Card className="p-5 mt-[18px] items-center">
          <Text className="font-sans-med text-sm text-ink-3">{t('tiada_peringatan')}</Text>
        </Card>
      ) : (
        <View className="gap-2 mt-[18px]">
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
    </Screen>
  );
}
