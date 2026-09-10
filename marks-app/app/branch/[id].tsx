import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { closeBranchBlocker, findBranch } from '@/data/branches';
import { roleLabel } from '@/i18n/labels';
import { useBranches } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function BranchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const branches = useBranches((s) => s.branches);
  const renameBranch = useBranches((s) => s.renameBranch);
  const setBranchActive = useBranches((s) => s.setBranchActive);
  const users = useUsers((s) => s.users);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const branch = findBranch(branches, id);
  const [name, setName] = useState(branch?.name ?? '');
  const [short, setShort] = useState(branch?.short ?? '');

  if (!branch) {
    return (
      <Screen>
        <BackLink label={t('tab_cawangan')} />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">
          {t('cawangan_tak_dijumpai')}
        </Text>
      </Screen>
    );
  }

  const assigned = users.filter((u) => u.active && u.branchId === branch.id);
  const dirty = name.trim() !== branch.name || short.trim() !== branch.short;

  const toggleActive = () => {
    if (branch.active) {
      const blocked = closeBranchBlocker(assigned.length);
      if (blocked) {
        Alert.alert(t('tak_boleh_tutup_cawangan'), blocked);
        return;
      }
    }
    setBranchActive(branch.id, !branch.active);
  };

  return (
    <Screen>
      <BackLink label={t('tab_cawangan')} />

      <View className="flex-row items-center gap-2.5 mt-4">
        <Text className="flex-1 font-sans-semi text-[20px] text-ink">{branch.name}</Text>
        <View className="px-2.5 py-[6px] rounded-lg" style={{ backgroundColor: C.rule }}>
          <Text className="font-mono-semi text-[11px] text-ink-3">{branch.id}</Text>
        </View>
      </View>

      <Card className="p-[15px] mt-4">
        <MonoLabel>{t('nama_kedai')}</MonoLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholderTextColor={C.ink6}
          autoCapitalize="words"
          className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
        />
        <View className="mt-3">
          <MonoLabel>{t('nama_pendek')}</MonoLabel>
          <TextInput
            value={short}
            onChangeText={setShort}
            placeholderTextColor={C.ink6}
            autoCapitalize="words"
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
          />
        </View>
        <Pressable
          onPress={() => renameBranch(branch.id, name, short)}
          disabled={!dirty || !name.trim()}
          accessibilityRole="button"
          className="mt-3 py-2.5 rounded-[10px] items-center"
          style={{ backgroundColor: dirty && name.trim() ? C.ink : C.line }}
        >
          <Text
            className="font-sans-semi text-[12.5px]"
            style={{ color: dirty && name.trim() ? '#fff' : C.ink6 }}
          >
            {t('simpan_nama')}
          </Text>
        </Pressable>
      </Card>

      <Card className="p-[15px] mt-2.5">
        <MonoLabel>{t('akaun_di_cawangan', { count: assigned.length })}</MonoLabel>
        {assigned.length === 0 ? (
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2.5">
            {t('belum_ada_akaun_pos')}
          </Text>
        ) : (
          <View className="gap-2 mt-3">
            {assigned.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => router.push(`/user/${u.id}`)}
                accessibilityRole="button"
                className="flex-row items-center gap-2.5 active:opacity-60"
              >
                <Avatar init={u.init} size={28} />
                <Text
                  className="flex-1 font-sans-med text-[12.5px] text-ink-2"
                  numberOfLines={1}
                >
                  {u.name}
                </Text>
                <Text className="font-mono text-[10px] text-ink-6">
                  {roleLabel(u.role, locale)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      <Pressable
        onPress={toggleActive}
        accessibilityRole="button"
        className="mt-2.5 py-3.5 rounded-xl border items-center bg-card active:opacity-70"
        style={{ borderColor: branch.active ? '#D6D6D2' : C.pass }}
      >
        <Text
          className="font-sans-semi text-sm"
          style={{ color: branch.active ? C.fail : C.pass }}
        >
          {branch.active ? t('tutup_cawangan') : t('buka_semula_cawangan')}
        </Text>
      </Pressable>
    </Screen>
  );
}
