import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { hydrateDirectory } from '@/lib/hydrate';
import { useActivity } from '@/store/useActivity';
import { useT } from '@/store/useLocale';
import { C } from '@/theme/scoring';

/**
 * Every Screen's content, held back while the first load after signing in or
 * reopening the app is still on its way: the stores are empty until then, and
 * the screen would otherwise say "Tiada rekod" about data that has simply not
 * arrived. If that load fails, the screen says so above its content and offers
 * to try again, instead of quietly showing nothing.
 */
export function FirstLoadGate({ children }: { children: ReactNode }) {
  const firstLoad = useActivity((s) => s.firstLoad);
  const t = useT();

  if (firstLoad === 'loading') {
    return (
      <Card className="p-6 mt-4 items-center gap-3">
        <ActivityIndicator color={C.ink5} />
        <Text className="font-sans-med text-sm text-ink-3 text-center">{t('memuatkan_data')}</Text>
      </Card>
    );
  }

  return (
    <>
      {firstLoad === 'failed' && (
        <View
          accessibilityRole="alert"
          className="rounded-xl px-3.5 py-3 mt-1 mb-3 border flex-row items-center gap-3"
          style={{ backgroundColor: C.failBg, borderColor: C.fail }}
        >
          <Text className="flex-1 font-sans-med text-[12.5px] leading-[18px]" style={{ color: C.fail }}>
            {t('gagal_muat_data')}
          </Text>
          <Pressable
            onPress={() => void hydrateDirectory()}
            accessibilityRole="button"
            className="py-2 px-3 rounded-[9px] bg-ink active:opacity-80"
          >
            <Text className="font-sans-semi text-[12px] text-white">{t('cuba_lagi')}</Text>
          </Pressable>
        </View>
      )}
      {children}
    </>
  );
}
