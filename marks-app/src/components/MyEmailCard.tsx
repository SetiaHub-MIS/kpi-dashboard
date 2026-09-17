import { useState } from 'react';
import { Alert, Pressable, Text, TextInput } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { emailBlocker } from '@/data/users';
import { useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

/**
 * The signed-in person's own e-mail. Where the reset link goes, so it is
 * theirs to keep current — the same way the password is. Blank clears it,
 * which hands resets back to admin.
 */
export function MyEmailCard() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const setMyEmail = useUsers((s) => s.setMyEmail);
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!me) return null;

  const value = draft ?? me.email ?? '';
  const dirty = value.trim().toLowerCase() !== (me.email ?? '');

  const save = async () => {
    const blocked = emailBlocker(value);
    if (blocked) {
      Alert.alert(t('perubahan_tak_disimpan'), blocked);
      return;
    }
    setBusy(true);
    try {
      const result = await setMyEmail(me.id, value.trim() || null);
      if (!result.ok) {
        Alert.alert(t('perubahan_tak_disimpan'), result.message);
        return;
      }
      setDraft(null);
      Alert.alert(t('emel_disimpan'), t('emel_disimpan_body'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-[15px] mt-2.5">
      <MonoLabel>{t('emel')}</MonoLabel>
      <TextInput
        value={value}
        onChangeText={setDraft}
        placeholder={t('contoh_emel')}
        placeholderTextColor={C.ink6}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        editable={!busy}
        className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
      />
      <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
        {me.email ? t('emel_saya_hint') : t('emel_saya_kosong')}
      </Text>
      <Pressable
        onPress={save}
        disabled={!dirty || busy}
        accessibilityRole="button"
        className="mt-3 py-2.5 rounded-[10px] items-center"
        style={{ backgroundColor: dirty && !busy ? C.ink : C.line }}
      >
        <Text
          className="font-sans-semi text-[12.5px]"
          style={{ color: dirty && !busy ? '#fff' : C.ink6 }}
        >
          {t('simpan_emel')}
        </Text>
      </Pressable>
    </Card>
  );
}
