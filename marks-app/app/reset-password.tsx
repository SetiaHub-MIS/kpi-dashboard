import { Href, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { HOME_ROUTE } from '@/components/SignInForm';
import { updatePassword } from '@/lib/auth';
import { hydrateDirectory } from '@/lib/hydrate';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useT } from '@/store/useLocale';
import { useSession } from '@/store/useSession';
import { C } from '@/theme/scoring';

const MIN_LENGTH = 6;

/**
 * Sets a new password. Reached two ways: from the e-mailed reset link, which
 * lands here carrying a recovery session, and from "Tukar kata laluan" while
 * signed in. Either way there is a session to update; without one the link
 * has expired, and the only honest answer is to ask for another.
 */
export default function ResetPassword() {
  const t = useT();
  const status = useSession((s) => s.status);
  const currentUserId = useSession((s) => s.currentUserId);
  const staff = useSession((s) => s.staff);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isSupabaseConfigured && status === 'restoring') {
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <ActivityIndicator color={C.ink5} />
      </View>
    );
  }

  if (isSupabaseConfigured && !currentUserId) {
    return (
      <Screen>
        <BackLink label={t('kembali_log_masuk')} />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">{t('perlu_log_masuk')}</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">{t('perlu_log_masuk_body')}</Text>
        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          className="mt-6 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
        >
          <Text className="font-sans-semi text-sm text-white">{t('kembali_log_masuk')}</Text>
        </Pressable>
      </Screen>
    );
  }

  const submit = async () => {
    if (password.length < MIN_LENGTH) {
      setError(t('kata_laluan_pendek'));
      return;
    }
    if (password !== confirm) {
      setError(t('kata_laluan_tak_sama'));
      return;
    }
    setBusy(true);
    try {
      const failed = await updatePassword(password);
      if (failed) {
        setError(failed);
        return;
      }
      Alert.alert(t('kata_laluan_disimpan'), t('kata_laluan_disimpan_body'));
      // A recovery session is a real session: load the directory under it and
      // carry on into the app rather than bouncing back to sign-in.
      await hydrateDirectory();
      router.replace(staff ? (HOME_ROUTE[staff.role] as Href) : '/');
    } finally {
      setBusy(false);
    }
  };

  const field =
    'bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[14px] text-ink';

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <BackLink label={t('kembali')} />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">{t('kata_laluan_baharu')}</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">{t('kata_laluan_baharu_intro')}</Text>

        <Card className="p-[15px] mt-4">
          <MonoLabel>{t('kata_laluan_baharu')}</MonoLabel>
          <TextInput
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            className={field}
          />
          <View className="mt-3">
            <MonoLabel>{t('sahkan_kata_laluan')}</MonoLabel>
            <TextInput
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                setError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              onSubmitEditing={submit}
              className={field}
            />
          </View>
        </Card>

        {error && (
          <View
            className="mt-2.5 rounded-[10px] px-3.5 py-3 border"
            style={{ backgroundColor: C.failBg, borderColor: C.fail }}
          >
            <Text className="font-sans-med text-[12.5px]" style={{ color: C.fail }}>
              {error}
            </Text>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          className="mt-3.5 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-sans-semi text-sm text-white">{t('simpan_kata_laluan')}</Text>
          )}
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
