import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { MonoLabel } from '@/components/Card';
import { Role } from '@/data/users';
import { AUTH_EMAIL_DOMAIN } from '@/lib/auth';
import { useBranches } from '@/store/useBranches';
import { useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

/** Where each role lands after signing in. */
export const HOME_ROUTE: Record<Role, string> = {
  staff: '/staff',
  store: '/pulangan',
  clerk: '/pulangan',
  supervisor: '/supervisor',
  area_manager: '/manager',
  manager: '/hq',
  general_manager: '/hq',
  human_resources: '/hr',
  admin: '/admin',
};

/**
 * Sign-in against Supabase Auth, keyed on the payroll number.
 *
 * The directory is loaded straight after, under the new session, so what the
 * app holds is already narrowed by the caller's own policies — a supervisor's
 * copy of `users` contains their branch and nothing else.
 */
export function SignInForm() {
  const signInWithPassword = useSession((s) => s.signInWithPassword);
  const status = useSession((s) => s.status);
  const error = useSession((s) => s.error);
  const clearError = useSession((s) => s.clearError);
  const hydrateUsers = useUsers((s) => s.hydrate);
  const hydrateBranches = useBranches((s) => s.hydrate);

  const [payrollId, setPayrollId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const busy = loading || status === 'working';

  const submit = async () => {
    setLoading(true);
    try {
      const staff = await signInWithPassword(payrollId, password);
      if (!staff) return;

      // Loaded here rather than at boot: before sign-in there is no session, and
      // every policy is written for `authenticated`, so the queries would come
      // back empty and look like an empty company.
      const now = new Date();
      const { fetchDirectory } = await import('@/lib/directory');
      try {
        const dir = await fetchDirectory({
          year: now.getUTCFullYear(),
          month: now.getUTCMonth() + 1,
        });
        hydrateBranches(dir.branches);
        hydrateUsers(dir.users);
      } catch {
        // Signed in but the directory would not load — better to continue on
        // the seed than to bounce someone who authenticated correctly.
      }

      router.replace(HOME_ROUTE[staff.role] as Href);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="mt-7">
      <MonoLabel>Nombor pekerja</MonoLabel>
      <TextInput
        value={payrollId}
        onChangeText={(t) => {
          setPayrollId(t);
          if (error) clearError();
        }}
        placeholder="cth: KP0093"
        placeholderTextColor={C.ink6}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="username"
        className="bg-card border border-line rounded-[10px] px-3.5 py-3 mt-2.5 font-mono text-[14px] text-ink"
      />

      <View className="mt-3.5">
        <MonoLabel>Kata laluan</MonoLabel>
        <TextInput
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (error) clearError();
          }}
          placeholder="••••••••"
          placeholderTextColor={C.ink6}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          onSubmitEditing={submit}
          className="bg-card border border-line rounded-[10px] px-3.5 py-3 mt-2.5 font-sans text-[14px] text-ink"
        />
      </View>

      {error && (
        <View
          className="mt-3 rounded-[10px] px-3.5 py-3 border"
          style={{ backgroundColor: C.failBg, borderColor: C.fail }}
        >
          <Text className="font-sans-med text-[12.5px] leading-[19px]" style={{ color: C.fail }}>
            {error}
          </Text>
        </View>
      )}

      <Pressable
        onPress={submit}
        disabled={busy}
        accessibilityRole="button"
        className="mt-4 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-sans-semi text-sm text-white">Log masuk</Text>
        )}
      </Pressable>

      <Text className="font-sans text-[12px] leading-[18px] text-ink-5 mt-3.5">
        Guna nombor pekerja anda, bukan e-mel. Akaun dibuka oleh admin — hubungi
        mereka jika belum ada kata laluan.
      </Text>
      <Text className="font-mono text-[10px] text-ink-6 mt-1.5">
        domain akaun: {AUTH_EMAIL_DOMAIN}
      </Text>
    </View>
  );
}
