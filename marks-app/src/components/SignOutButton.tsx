import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ROLE_LABEL } from '@/data/users';
import { signOutAndClear } from '@/lib/hydrate';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useQueue } from '@/store/useQueue';
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
 */
export function SignOutButton() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const pending = useQueue((s) => s.pending);
  const [busy, setBusy] = useState(false);

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

      {pending.length > 0 && (
        <Text className="font-sans text-[12px] leading-[18px] mb-2.5" style={{ color: C.warn }}>
          {pending.length} markah masih menunggu sambungan. Ia kekal dalam telefon
          ini dan akan dihantar sendiri, walaupun selepas log keluar.
        </Text>
      )}

      <Pressable
        onPress={leave}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Log keluar"
        className="py-3.5 rounded-xl border items-center active:opacity-70"
        style={{ borderColor: C.fail, opacity: busy ? 0.6 : 1 }}
      >
        {busy ? (
          <ActivityIndicator color={C.fail} />
        ) : (
          <Text className="font-sans-semi text-sm" style={{ color: C.fail }}>
            {isSupabaseConfigured ? 'Log keluar' : 'Tukar peranan'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
