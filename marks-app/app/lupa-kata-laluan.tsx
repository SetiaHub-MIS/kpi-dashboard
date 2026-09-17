import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { payrollBlocker, requestPasswordReset } from '@/lib/auth';
import { useT } from '@/store/useLocale';
import { C } from '@/theme/scoring';

/** Where the e-mailed link brings the person back to. Web has an origin; the phone falls back to the deployed site. */
const resetRedirect = () =>
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/reset-password`
    : process.env.EXPO_PUBLIC_WEB_URL
      ? `${process.env.EXPO_PUBLIC_WEB_URL}/reset-password`
      : undefined;

/**
 * Asks for a reset link by payroll number. The outcome shown is the same
 * whether or not the number exists or has an address — this screen must not
 * be a way to find out who is on the payroll.
 */
export default function LupaKataLaluan() {
  const t = useT();
  const [payrollId, setPayrollId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async () => {
    const id = payrollId.trim().toUpperCase();
    const blocked = payrollBlocker(id);
    if (blocked) {
      setError(blocked);
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(id, resetRedirect());
      setSentTo(id);
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <Screen>
        <BackLink label={t('kembali_log_masuk')} />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">{t('pautan_dihantar_title')}</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          {t('pautan_dihantar_body', { id: sentTo })}
        </Text>
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

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <BackLink label={t('kembali_log_masuk')} />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">{t('set_semula_kata_laluan')}</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">{t('set_semula_intro')}</Text>

        <Card className="p-[15px] mt-4">
          <MonoLabel>{t('nombor_pekerja')}</MonoLabel>
          <TextInput
            value={payrollId}
            onChangeText={(text) => {
              setPayrollId(text);
              setError(null);
            }}
            placeholder={t('contoh_payroll')}
            placeholderTextColor={C.ink6}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="username"
            onSubmitEditing={submit}
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-mono text-[14px] text-ink"
          />
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
            <Text className="font-sans-semi text-sm text-white">{t('hantar_pautan')}</Text>
          )}
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
