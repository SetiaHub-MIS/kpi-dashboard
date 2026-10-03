import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/store/useLocale';
import { C } from '@/theme/scoring';

/** The tab bar's own height above the bottom inset (components/tabOptions.tsx). */
const TAB_BAR = 49;

/**
 * "New version ready", floating just above the tab bar while a downloaded
 * update waits for a signed-in person to restart into it (lib/appUpdates.ts).
 * "Later" hides it; the update then applies the next time the app is opened.
 */
export function UpdateBanner({ onRestart, onLater }: { onRestart: () => void; onLater: () => void }) {
  const insets = useSafeAreaInsets();
  const t = useT();

  return (
    <View
      accessibilityRole="alert"
      className="absolute left-3 right-3 rounded-xl px-3.5 py-3 border bg-card flex-row items-center gap-3"
      style={{
        bottom: insets.bottom + TAB_BAR + 10,
        borderColor: C.line,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <View className="flex-1">
        <Text className="font-sans-semi text-[13px] text-ink">{t('versi_baharu_tajuk')}</Text>
        <Text className="font-sans text-[12px] leading-[17px] text-ink-4 mt-0.5">
          {t('versi_baharu_badan')}
        </Text>
      </View>
      <Pressable
        onPress={onLater}
        accessibilityRole="button"
        className="py-2 px-2.5 rounded-[9px] active:opacity-70"
      >
        <Text className="font-sans-semi text-[12px] text-ink-3">{t('versi_baharu_nanti')}</Text>
      </Pressable>
      <Pressable
        onPress={onRestart}
        accessibilityRole="button"
        className="py-2 px-3 rounded-[9px] bg-ink active:opacity-80"
      >
        <Text className="font-sans-semi text-[12px] text-white">{t('versi_baharu_mula')}</Text>
      </Pressable>
    </View>
  );
}
