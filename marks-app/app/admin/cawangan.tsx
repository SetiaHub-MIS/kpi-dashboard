import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ROLE_LABEL, isMarked } from '@/data/users';
import { useBranches } from '@/store/useBranches';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';
import { SignOutButton } from '@/components/SignOutButton';

export default function Cawangan() {
  const branches = useBranches((s) => s.branches);
  const users = useUsers((s) => s.users);

  const unassigned = users.filter((u) => u.active && u.branchId == null && u.role !== 'admin');

  return (
    <Screen>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <MonoLabel>Pentadbiran</MonoLabel>
          <Text className="font-sans-semi text-2xl text-ink mt-2">Cawangan</Text>
        </View>
        <Pressable
          onPress={() => router.push('/branch-new')}
          accessibilityRole="button"
          accessibilityLabel="Tambah cawangan"
          className="px-3.5 py-2.5 rounded-xl bg-ink active:opacity-80"
        >
          <Text className="font-sans-semi text-[13px] text-white">+ Tambah</Text>
        </Pressable>
      </View>

      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        Setiap akaun dipos ke satu cawangan. SV/AS dan Area Manager hanya melihat
        pekerja di cawangan mereka.
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
                <Stat label="Pekerja" value={staff.length} />
                <Stat label={ROLE_LABEL.supervisor} value={supervisors.length} />
                <Stat label="Area Mgr" value={managers.length} />
              </View>

              {!b.active && (
                <Text className="font-sans-med text-[11.5px] mt-3" style={{ color: C.warn }}>
                  Ditutup — tidak boleh dipilih untuk akaun baharu.
                </Text>
              )}
              {b.active && managers.length === 0 && (
                <Text className="font-sans-med text-[11.5px] mt-3" style={{ color: C.warn }}>
                  Tiada Area Manager di cawangan ini.
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {unassigned.length > 0 && (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>Tiada cawangan</MonoLabel>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2.5">
            {unassigned.length} akaun belum dipos ke mana-mana cawangan, jadi tiada SV/AS
            atau manager nampak mereka.
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
