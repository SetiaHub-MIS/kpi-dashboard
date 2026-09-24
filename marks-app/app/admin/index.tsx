import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { MonoLabel } from '@/components/Card';
import { OutletPicker } from '@/components/OutletPicker';
import { Screen } from '@/components/Screen';
import { useBranches } from '@/store/useBranches';
import { ROLE_LADDER, Role } from '@/data/users';
import { roleLabel, supervisorTitleLabel } from '@/i18n/labels';
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

      {/* Forty outlets do not fit side by side on a phone; a dropdown does. */}
      <View className="mt-4">
        <OutletPicker
          outlets={branches.map((b) => b.id)}
          value={branchFilter}
          onChange={setBranchFilter}
          allLabel={t('semua_cawangan')}
          countOf={(bid) => (bid === null ? users.length : users.filter((u) => u.branchId === bid).length)}
        />
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
                {/* Number, outlet and role on one line: on a wide screen a
                    badge at the card's far edge is out of the eye's path. */}
                <Text className="font-mono text-[11px] text-ink-5 mt-1" numberOfLines={1}>
                  {u.id} · {u.branchId ?? 'HQ'} · {roleLabel(u.role, locale)}
                  {u.role === 'supervisor' && u.supervisorTitle
                    ? ` · ${supervisorTitleLabel(u.supervisorTitle, locale)}`
                    : ''}
                  {u.active ? '' : t('nyahaktif_suffix')}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
