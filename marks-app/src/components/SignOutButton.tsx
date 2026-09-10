import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ROLE_LABEL } from '@/data/users';
import { signOutAndClear } from '@/lib/hydrate';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Locale } from '@/i18n/strings';
import { useQueue } from '@/store/useQueue';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

/**
 * The way out. Without one, the only way off an account on a handset was to
 * restart Expo — which is fine for a developer and useless in a stockroom.
 *
 * Warns before leaving with marks still queued. They survive a sign-out and
 * will send from this device, but they belong to the person who typed them, and
 * handing the phone over without saying so would be a nasty surprise for both.
 *
 * The language toggle lives here rather than on a separate settings screen
 * because this component is already the one thing placed on all seven role
 * areas — adding it here means every screen gets it for free.
 */
export function SignOutButton() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const pending = useQueue((s) => s.pending);
  const [busy, setBusy] = useState(false);
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);

  const leave = async () => {
    setBusy(true);
    try {
      await signOutAndClear();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="mt-6 pt-5 border-t border-line">
      {me && (
        <Text className="font-mono text-[10.5px] text-ink-5 mb-2.5">
          {me.name} · {me.id} · {ROLE_LABEL[me.role]}
        </Text>
      )}

      <View className="flex-row items-center gap-2.5 mb-4">
        <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5">
          {t('bahasa')}
        </Text>
        <View className="flex-row gap-1.5">
          {(['ms', 'en'] as Locale[]).map((l) => {
            const on = locale === l;
            return (
              <Pressable
                key={l}
                onPress={() => setLocale(l)}
                accessibilityRole="button"
                accessibilityLabel={l === 'ms' ? 'Bahasa Melayu' : 'English'}
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
      </View>

      {pending.length > 0 && (
        <Text className="font-sans text-[12px] leading-[18px] mb-2.5" style={{ color: C.warn }}>
          {t('marks_pending_warning', { count: pending.length })}
        </Text>
      )}

      <Pressable
        onPress={leave}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('log_keluar')}
        className="py-3.5 rounded-xl border items-center active:opacity-70"
        style={{ borderColor: C.fail, opacity: busy ? 0.6 : 1 }}
      >
        {busy ? (
          <ActivityIndicator color={C.fail} />
        ) : (
          <Text className="font-sans-semi text-sm" style={{ color: C.fail }}>
            {isSupabaseConfigured ? t('log_keluar') : t('tukar_peranan')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
