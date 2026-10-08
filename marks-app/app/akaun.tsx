import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BackLink } from '@/components/BackLink';
import { MyEmailCard } from '@/components/MyEmailCard';
import { Screen } from '@/components/Screen';
import { publishedLabel } from '@/data/updatePolicy';
import { roleLabel } from '@/i18n/labels';
import { runningCodeNow } from '@/lib/appUpdates';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useBranchLabel } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';

/**
 * The signed-in person's own account: the address a reset goes to, and the
 * way to change the password. Pekerja kedai have this on their Profil tab;
 * every other role reaches it from the sign-out block.
 */
export default function Akaun() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchLabel = useBranchLabel();
  const t = useT();
  const locale = useLocale((s) => s.locale);

  return (
    <Screen>
      <BackLink label={t('kembali')} />
      <Text className="font-sans-semi text-[22px] text-ink mt-4">{t('akaun_saya')}</Text>

      {me && (
        <View className="flex-row gap-3 items-center mt-4">
          <Avatar init={me.init} size={46} />
          <View className="flex-1 min-w-0">
            <Text className="font-sans-semi text-[18px] text-ink">{me.name}</Text>
            <Text className="font-mono text-xs text-ink-5 mt-1">
              {me.id} · {roleLabel(me.role, locale)}
              {me.branchId ? ` · ${branchLabel(me.branchId)}` : ''}
            </Text>
          </View>
        </View>
      )}

      <MyEmailCard />

      {isSupabaseConfigured && (
        <Pressable
          onPress={() => router.push('/reset-password')}
          accessibilityRole="button"
          className="mt-2.5 py-3.5 rounded-xl border border-line items-center bg-card active:opacity-70"
        >
          <Text className="font-sans-semi text-sm text-ink-2">{t('tukar_kata_laluan')}</Text>
        </Pressable>
      )}

      <Text className="font-mono text-[11px] text-ink-6 text-center mt-8">{versionLine(t)}</Text>
    </Screen>
  );
}

/**
 * Which version this phone is running, to check it against `eas update:list`:
 * a downloaded update shows when it was published and the start of its ID.
 */
function versionLine(t: ReturnType<typeof useT>): string {
  const version = Constants.expoConfig?.version ?? '';
  const code = runningCodeNow();
  switch (code.kind) {
    case 'web':
      return t('versi_web', { version });
    case 'dev':
      return t('versi_dev', { version });
    case 'builtin':
      return t('versi_asal', { version });
    case 'update':
      return t('versi_kemas_kini', {
        version,
        when: code.publishedAt ? publishedLabel(code.publishedAt) : '?',
        id: code.id,
      });
  }
}
