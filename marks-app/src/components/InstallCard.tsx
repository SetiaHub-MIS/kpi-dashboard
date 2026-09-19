import { Pressable, Text, View } from 'react-native';
import { promptInstall, useInstallState } from '@/lib/install';
import { useT } from '@/store/useLocale';
import { C } from '@/theme/scoring';

/**
 * "Put this on your home screen", on the sign-in screen, for anyone reading
 * it in a browser tab. Gone once the app is running from the home screen.
 */
export function InstallCard() {
  const kind = useInstallState();
  const t = useT();
  if (kind === 'hidden') return null;

  const body =
    kind === 'prompt'
      ? t('pasang_intro')
      : kind === 'ios'
        ? t('pasang_ios')
        : kind === 'in-app'
          ? t('pasang_in_app')
          : t('pasang_menu');

  return (
    <View
      className="mt-5 rounded-[12px] px-4 py-3.5 border"
      style={{ backgroundColor: C.card, borderColor: C.line }}
    >
      <Text className="font-sans-semi text-[13.5px] text-ink">{t('pasang_title')}</Text>
      <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-1.5">{body}</Text>
      {kind === 'prompt' && (
        <Pressable
          onPress={() => void promptInstall()}
          accessibilityRole="button"
          className="self-start mt-3 px-4 py-2.5 rounded-lg bg-ink active:opacity-80"
        >
          <Text className="font-sans-semi text-[13px] text-white">{t('pasang_butang')}</Text>
        </Pressable>
      )}
    </View>
  );
}
