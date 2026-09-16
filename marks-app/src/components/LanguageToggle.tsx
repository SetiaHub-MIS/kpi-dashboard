import { Pressable, Text, View } from 'react-native';
import { Locale } from '@/i18n/strings';
import { useLocale } from '@/store/useLocale';
import { C } from '@/theme/scoring';

/**
 * BM / EN. Sits on the sign-in screen, so the language is chosen before
 * anyone has to read a word of the app — and it is per device, so a shift
 * phone keeps whatever the shop settled on.
 */
export function LanguageToggle() {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);

  return (
    <View className="flex-row gap-1.5">
      {(['ms', 'en'] as Locale[]).map((l) => {
        const on = locale === l;
        return (
          <Pressable
            key={l}
            onPress={() => setLocale(l)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={l === 'ms' ? 'Bahasa Melayu' : 'English'}
            accessibilityState={{ selected: on }}
            className="px-2.5 py-1 rounded-md border"
            style={{
              borderColor: on ? 'transparent' : C.line,
              backgroundColor: on ? C.ink : C.card,
            }}
          >
            <Text
              className="font-mono-semi text-[10.5px]"
              style={{ color: on ? '#FFFFFF' : C.ink4 }}
            >
              {l === 'ms' ? 'BM' : 'EN'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
