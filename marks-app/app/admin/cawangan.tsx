import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { isMarked } from '@/data/users';
import { roleLabel } from '@/i18n/labels';
import { useBranches } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';
import { SignOutButton } from '@/components/SignOutButton';

export default function Cawangan() {
  const branches = useBranches((s) => s.branches);
  const users = useUsers((s) => s.users);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const unassigned = users.filter((u) => u.active && u.branchId == null && u.role !== 'admin');

  return (
    <Screen>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <MonoLabel>{t('pentadbiran')}</MonoLabel>
          <Text className="font-sans-semi text-2xl text-ink mt-2">{t('tab_cawangan')}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/branch-new')}
          accessibilityRole="button"
          accessibilityLabel={t('tambah_cawangan_a11y')}
          className="px-3.5 py-2.5 rounded-xl bg-ink active:opacity-80"
        >
          <Text className="font-sans-semi text-[13px] text-white">{t('tambah')}</Text>
        </Pressable>
      </View>

      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {t('cawangan_intro')}
      </Text>

      <View className="gap-2.5 mt-[18px]">
        {branches.map((b) => {
          const assigned = users.filter((u) => u.active && u.branchId === b.id);
          const staff = assigned.filter((u) => isMarked(u.role));
          const supervisors = assigned.filter((u) => u.role === 'supervisor');
          const managers = assigned.filter((u) => u.role === 'area_manager');

          return (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/branch/${b.id}`)}
              accessibilityRole="button"
              className="bg-card border border-line rounded-[13px] p-[15px] active:opacity-70"
              style={{ opacity: b.active ? 1 : 0.55 }}
            >
              <View className="flex-row items-center gap-2.5">
                <Text className="flex-1 font-sans-semi text-[14px] text-ink" numberOfLines={1}>
                  {b.name}
                </Text>
                <View className="px-2 py-[5px] rounded-md" style={{ backgroundColor: C.rule }}>
                  <Text className="font-mono-semi text-[10px] text-ink-3">{b.id}</Text>
                </View>
              </View>

              <View className="flex-row gap-4 mt-3">
                <Stat label={t('stat_pekerja')} value={staff.length} />
                <Stat label={roleLabel('supervisor', locale)} value={supervisors.length} />
                <Stat label={t('stat_area_mgr')} value={managers.length} />
              </View>

              {!b.active && (
                <Text className="font-sans-med text-[11.5px] mt-3" style={{ color: C.warn }}>
                  {t('cawangan_ditutup')}
                </Text>
              )}
              {b.active && managers.length === 0 && (
                <Text className="font-sans-med text-[11.5px] mt-3" style={{ color: C.warn }}>
                  {t('tiada_am_cawangan')}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {unassigned.length > 0 && (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('tiada_cawangan')}</MonoLabel>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2.5">
            {t('akaun_tiada_cawangan', { count: unassigned.length })}
          </Text>
        </Card>
      )}

      <SignOutButton />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text className="font-mono-semi text-[17px] text-ink">{value}</Text>
      <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-1">
        {label}
      </Text>
    </View>
  );
}
