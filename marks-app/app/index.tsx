import { Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonoLabel } from '@/components/Card';
import { useActiveBranches } from '@/store/useBranches';
import { ME_ID } from '@/data/crew';
import { ROLE_BLURB, ROLE_LABEL, Role } from '@/data/users';
import { useSession } from '@/store/useSession';
import { byRole, findUser, inBranch, useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

const BRANCH_ROLES: { role: Role; href: Href }[] = [
  { role: 'manager', href: '/manager' },
  { role: 'supervisor', href: '/supervisor' },
  { role: 'staff', href: '/staff' },
  { role: 'store', href: '/pulangan' },
  { role: 'clerk', href: '/pulangan' },
];

export default function RolePicker() {
  const insets = useSafeAreaInsets();
  const users = useUsers((s) => s.users);
  const signIn = useSession((s) => s.signIn);
  const branches = useActiveBranches();
  const [selected, setSelected] = useState<string | null>(null);
  const branchId = selected ?? branches[0]?.id ?? null;

  const admin = byRole(users, 'admin')[0];

  const enter = (userId: string | undefined, href: Href) => {
    if (!userId) return;
    signIn(userId);
    router.push(href);
  };

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 36,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <MonoLabel>Log masuk</MonoLabel>
        <Text className="font-sans-semi text-[30px] leading-9 text-ink mt-3">
          Checklist{'\n'}Mingguan
        </Text>
        <Text className="font-sans text-[14.5px] leading-6 text-ink-3 mt-3">
          SV/AS dan Area Manager hanya melihat pekerja di cawangan mereka sendiri.
        </Text>

        <View className="flex-row flex-wrap gap-1.5 mt-5">
          {branches.map((b) => {
            const on = b.id === branchId;
            return (
              <Pressable
                key={b.id}
                onPress={() => setSelected(b.id)}
                accessibilityRole="button"
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

        <View className="gap-2.5 mt-4">
          {BRANCH_ROLES.map(({ role, href }) => {
            const me = findUser(users, ME_ID);
            // The Pekerja self-view still reads a Machang-only fixture, so it is
            // offered only where that fixture actually belongs.
            const fixtureOnly = role === 'staff' && me?.branchId !== branchId;
            const holder = fixtureOnly ? undefined : inBranch(byRole(users, role), branchId)[0];
            const disabled = !holder;
            return (
              <Pressable
                key={role}
                onPress={() => enter(holder?.id, href)}
                disabled={disabled}
                accessibilityRole="button"
                className="bg-card border border-line rounded-[14px] p-[18px] active:opacity-70"
                style={{ opacity: disabled ? 0.5 : 1 }}
              >
                <MonoLabel>{ROLE_LABEL[role].toUpperCase()}</MonoLabel>
                <Text className="font-sans-semi text-[16px] text-ink mt-2">
                  {holder
                    ? `${holder.name} · ${holder.id}`
                    : fixtureOnly
                      ? 'Paparan sendiri: Machang sahaja'
                      : 'Tiada pemegang di cawangan ini'}
                </Text>
                <Text className="font-sans text-[13px] leading-5 text-ink-4 mt-1.5">
                  {fixtureOnly
                    ? 'Rekod mingguan pekerja masih data contoh Kedai Machang.'
                    : ROLE_BLURB[role]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => enter(admin?.id, '/admin')}
          accessibilityRole="button"
          className="bg-card border border-line rounded-[14px] p-[18px] mt-4 active:opacity-70"
        >
          <MonoLabel>{ROLE_LABEL.admin.toUpperCase()} · SEMUA CAWANGAN</MonoLabel>
          <Text className="font-sans-semi text-[16px] text-ink mt-2">
            {admin ? `${admin.name} · ${admin.id}` : 'Tiada admin'}
          </Text>
          <Text className="font-sans text-[13px] leading-5 text-ink-4 mt-1.5">
            {ROLE_BLURB.admin}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
