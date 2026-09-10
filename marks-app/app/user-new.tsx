import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useActiveBranches } from '@/store/useBranches';
import {
  ROLE_LADDER,
  Role,
  newUserBlocker,
  nextIdFor,
} from '@/data/users';
import { roleBlurb, roleLabel } from '@/i18n/labels';
import { useLocale, useT } from '@/store/useLocale';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function NewUser() {
  const users = useUsers((s) => s.users);
  const addUser = useUsers((s) => s.addUser);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const branches = useActiveBranches();
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const branchId = selectedBranch ?? branches[0]?.id ?? null;
  /** Empty means "use the suggested next number in this role's series". */
  const [customId, setCustomId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const suggestedId = nextIdFor(users, role);
  const id = customId.trim() || suggestedId;

  const submit = () => {
    const blocked = newUserBlocker(users, name, id);
    if (blocked) {
      setError(blocked);
      return;
    }
    // Admin is cross-branch by definition, so it is never pinned to one kedai.
    addUser({ name, id, role, branchId: role === 'admin' ? null : branchId });
    router.replace(`/user/${id.trim().toUpperCase()}`);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <BackLink label={t('tab_pengguna')} />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">{t('akaun_baharu')}</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          {t('akaun_baharu_intro')}
        </Text>

        <Card className="p-[15px] mt-4">
          <MonoLabel>{t('nama_penuh')}</MonoLabel>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder={t('contoh_nama_penuh')}
            placeholderTextColor={C.ink6}
            autoCapitalize="words"
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
          />
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('tab_peranan')}</MonoLabel>
          <View className="gap-1.5 mt-2.5">
            {ROLE_LADDER.map((r) => {
              const on = role === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    setRole(r);
                    setError(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  className="rounded-[10px] px-3 py-2.5 border"
                  style={{
                    borderColor: on ? C.ink : C.line,
                    backgroundColor: on ? C.rule : C.card,
                  }}
                >
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className="w-[7px] h-[7px] rounded-full"
                      style={{ backgroundColor: on ? C.ink : C.ink8 }}
                    />
                    <Text
                      className={
                        on
                          ? 'flex-1 font-sans-semi text-[13px] text-ink'
                          : 'flex-1 font-sans-med text-[13px] text-ink-4'
                      }
                    >
                      {roleLabel(r, locale)}
                    </Text>
                  </View>
                  {on && (
                    <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-1.5 pl-[17px]">
                      {roleBlurb(r, locale)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {role !== 'admin' && (
          <Card className="p-[15px] mt-2.5">
            <MonoLabel>{t('tab_cawangan')}</MonoLabel>
            <View className="flex-row flex-wrap gap-1.5 mt-2.5">
              {branches.map((b) => {
                const on = branchId === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => setSelectedBranch(b.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    className="flex-1 py-2.5 rounded-lg border items-center"
                    style={{
                      borderColor: on ? 'transparent' : C.line,
                      backgroundColor: on ? C.ink : C.card,
                    }}
                  >
                    <Text
                      className="font-sans-med text-[12.5px]"
                      style={{ color: on ? '#fff' : C.ink3 }}
                    >
                      {b.short}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
              {t('cawangan_hint_sv')}
            </Text>
          </Card>
        )}

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('no_pekerja')}</MonoLabel>
          <TextInput
            value={customId}
            onChangeText={(text) => {
              setCustomId(text);
              setError(null);
            }}
            placeholder={suggestedId}
            placeholderTextColor={C.ink6}
            autoCapitalize="characters"
            autoCorrect={false}
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-mono text-[13px] text-ink"
          />
          <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
            {t('biarkan_kosong_guna_id', { id: suggestedId })}
          </Text>
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
          accessibilityRole="button"
          className="mt-3.5 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
        >
          <Text className="font-sans-semi text-sm text-white">
            {t('cipta_akaun_role', { role: roleLabel(role, locale) })}
          </Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
