import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { defaultShort, newBranchBlocker, suggestBranchCode } from '@/data/branches';
import { useBranches } from '@/store/useBranches';
import { C } from '@/theme/scoring';

export default function NewBranch() {
  const branches = useBranches((s) => s.branches);
  const addBranch = useBranches((s) => s.addBranch);

  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  /** Empty means "use the code suggested from the name". */
  const [customCode, setCustomCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const suggested = suggestBranchCode(name, branches);
  const code = (customCode.trim() || suggested).toUpperCase();

  const submit = () => {
    const blocked = newBranchBlocker(branches, name, code);
    if (blocked) {
      setError(blocked);
      return;
    }
    addBranch({ id: code, name, short });
    router.replace(`/branch/${code}`);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <BackLink label="Cawangan" />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">Cawangan baharu</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          Kod cawangan muncul di sebelah no. pekerja dan tidak boleh diubah selepas dicipta.
        </Text>

        <Card className="p-[15px] mt-4">
          <MonoLabel>Nama kedai</MonoLabel>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            placeholder="cth: Kedai Pasir Mas"
            placeholderTextColor={C.ink6}
            autoCapitalize="words"
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
          />
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>Nama pendek</MonoLabel>
          <TextInput
            value={short}
            onChangeText={setShort}
            placeholder={name.trim() ? defaultShort(name) : 'cth: Pasir Mas'}
            placeholderTextColor={C.ink6}
            autoCapitalize="words"
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
          />
          <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
            Digunakan pada butang pilih cawangan.
          </Text>
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>Kod cawangan</MonoLabel>
          <TextInput
            value={customCode}
            onChangeText={(t) => {
              setCustomCode(t);
              setError(null);
            }}
            placeholder={suggested || 'cth: PMS'}
            placeholderTextColor={C.ink6}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={5}
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-mono text-[13px] text-ink"
          />
          {!!suggested && (
            <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
              Biarkan kosong untuk guna {suggested}.
            </Text>
          )}
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
          <Text className="font-sans-semi text-sm text-white">Cipta cawangan</Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
