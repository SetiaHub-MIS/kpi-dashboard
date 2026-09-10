import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { findBranch } from '@/data/branches';
import { useBranches } from '@/store/useBranches';
import { ROLE_LADDER, Role } from '@/data/users';
import { roleLabel } from '@/i18n/labels';
import { useLocale, useT } from '@/store/useLocale';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

type Filter = Role | 'all';

const FILTERS: Filter[] = ['all', ...ROLE_LADDER];

export default function AdminUsers() {
  const users = useUsers((s) => s.users);
  const branches = useBranches((s) => s.branches);
  const [filter, setFilter] = useState<Filter>('all');
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const shown = users.filter(
    (u) =>
      (filter === 'all' || u.role === filter) &&
      (branchFilter === null || u.branchId === branchFilter)
  );
  const inactive = users.filter((u) => !u.active).length;

  return (
    <Screen>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <MonoLabel>{t('semua_cawangan_admin')}</MonoLabel>
          <Text className="font-sans-semi text-2xl text-ink mt-2">{t('tab_pengguna')}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/user-new')}
          accessibilityRole="button"
          accessibilityLabel={t('tambah_pengguna_a11y')}
          className="px-3.5 py-2.5 rounded-xl bg-ink active:opacity-80"
        >
          <Text className="font-sans-semi text-[13px] text-white">{t('tambah')}</Text>
        </Pressable>
      </View>

      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {t('akaun_aktif_summary', {
          active: users.filter((u) => u.active).length,
          inactive: inactive > 0 ? t('inactive_suffix', { count: inactive }) : '',
        })}
      </Text>

      <View className="flex-row gap-1.5 mt-4">
        {[null, ...branches.map((b) => b.id)].map((bid) => {
          const on = branchFilter === bid;
          return (
            <Pressable
              key={bid ?? 'all'}
              onPress={() => setBranchFilter(bid)}
              accessibilityRole="button"
              className="flex-1 py-2 rounded-lg border items-center"
              style={{
                borderColor: on ? 'transparent' : C.line,
                backgroundColor: on ? C.ink : C.card,
              }}
            >
              <Text
                className="font-sans-med text-[12px]"
                style={{ color: on ? '#fff' : C.ink3 }}
                numberOfLines={1}
              >
                {bid === null ? t('semua') : (findBranch(branches, bid)?.short ?? bid)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap gap-1.5 mt-2">
        {FILTERS.map((f) => {
          const on = filter === f;
          const count = f === 'all' ? users.length : users.filter((u) => u.role === f).length;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              className="px-3 py-2 rounded-lg border"
              style={{
                borderColor: on ? 'transparent' : C.line,
                backgroundColor: on ? C.ink : C.card,
              }}
            >
              <Text
                className="font-sans-med text-[12px]"
                style={{ color: on ? '#fff' : C.ink3 }}
              >
                {f === 'all' ? t('semua') : roleLabel(f, locale)} {count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-2 mt-4">
        {shown.map((u) => (
          <Pressable
            key={u.id}
            onPress={() => router.push(`/user/${u.id}`)}
            accessibilityRole="button"
            className="bg-card border border-line rounded-xl px-3.5 py-3 active:opacity-70"
            style={{ opacity: u.active ? 1 : 0.55 }}
          >
            <View className="flex-row items-center gap-3">
              <Avatar init={u.init} />
              <View className="flex-1 min-w-0">
                <Text className="font-sans-semi text-[13.5px] text-ink" numberOfLines={1}>
                  {u.name}
                </Text>
                <Text className="font-mono text-[11px] text-ink-5 mt-1">
                  {u.id} · {u.branchId ?? 'HQ'}
                  {u.active ? '' : t('nyahaktif_suffix')}
                </Text>
              </View>
              <View
                className="px-2.5 py-[6px] rounded-lg"
                style={{ backgroundColor: u.role === 'admin' ? C.passBg : C.rule }}
              >
                <Text
                  className="font-mono-semi text-[10px]"
                  style={{ color: u.role === 'admin' ? C.pass : C.ink3 }}
                >
                  {roleLabel(u.role, locale).toUpperCase()}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
