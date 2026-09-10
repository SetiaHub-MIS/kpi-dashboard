import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { Locale, translate } from '@/i18n/strings';

const KEY = 'checklist.locale.v1';

/**
 * Per-device, not per-account — a shift phone should not switch language
 * because whoever signed in last preferred a different one. Persisted so it
 * survives a restart; defaults to Malay, the language every screen shipped
 * in before this existed.
 */
type LocaleState = {
  locale: Locale;
  loaded: boolean;
  load: () => Promise<void>;
  setLocale: (locale: Locale) => void;
};

export const useLocale = create<LocaleState>((set) => ({
  locale: 'ms',
  loaded: false,

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(KEY);
      if (saved === 'ms' || saved === 'en') set({ locale: saved });
    } catch {
      // No stored preference, or storage unavailable — Malay stands.
    }
    set({ loaded: true });
  },

  setLocale: (locale) => {
    set({ locale });
    void AsyncStorage.setItem(KEY, locale).catch(() => {
      // Stays in memory for this session even if it cannot be written back.
    });
  },
}));

/** `const t = useT();` then `t('key')` or `t('key', { name: person.short })`. */
export function useT() {
  const locale = useLocale((s) => s.locale);
  return (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
}
