import { Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonoLabel } from '@/components/Card';
import { HOME_ROUTE, SignInForm } from '@/components/SignInForm';
import { HQ_BRANCH_ID, isHq } from '@/data/branches';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useActiveBranches } from '@/store/useBranches';
import { ME_ID } from '@/data/crew';
import { ROLE_BLURB, ROLE_LABEL, Role } from '@/data/users';
import { useSession } from '@/store/useSession';
import { byRole, findUser, inBranch, useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

/** Posted to one kedai, so the outlet picker above decides who is offered. */
const BRANCH_ROLES: { role: Role; href: Href }[] = [
  { role: 'area_manager', href: '/manager' },
  { role: 'supervisor', href: '/supervisor' },
  { role: 'staff', href: '/staff' },
];

/**
 * The central store at HQ. Listed apart from the outlet roles because they are
 * not posted to a kedai — one team handles returns from all of them — so
 * hiding them behind an outlet selector would be wrong.
 */
const STORE_ROLES: { role: Role; href: Href }[] = [
  { role: 'store', href: '/pulangan' },
  { role: 'clerk', href: '/pulangan' },
];

/**
 * Head office. These four hold no branch, so they are listed apart from the
 * outlet roles. Admin gets the administration console; manager and general
 * manager get the outlet report, which names no one. HR goes further — it reads
 * individual marking sheets and the returns flow — so it has its own area.
 */
const HQ_ROLES: { role: Role; href: Href }[] = [
  { role: 'manager', href: '/hq' },
  { role: 'general_manager', href: '/hq' },
  { role: 'human_resources', href: '/hr' },
  { role: 'admin', href: '/admin' },
];

/**
 * The way in. With Supabase configured this is a real sign-in; without it, the
 * demo list of people to become — which is how the app ran before there was a
 * database, and how it still runs for anyone without project credentials.
 */
export default function RolePicker() {
  const insets = useSafeAreaInsets();
  const status = useSession((s) => s.status);
  const signedInStaff = useSession((s) => s.staff);

  // A restored session should land on the person's own screen, not on a login
  // form asking them to prove what the device already knows.
  useEffect(() => {
    if (signedInStaff) router.replace(HOME_ROUTE[signedInStaff.role] as Href);
  }, [signedInStaff]);
  const users = useUsers((s) => s.users);
  const signIn = useSession((s) => s.signIn);
  const branches = useActiveBranches();
  const outlets = branches.filter((b) => !isHq(b.id));
  const [selected, setSelected] = useState<string | null>(null);
  // Default to the first outlet that actually has someone posted to it: with 38
  // kedai and a two-outlet pilot, landing on an empty one reads as breakage.
  const firstStaffed = outlets.find((b) => users.some((u) => u.active && u.branchId === b.id));
  const branchId = selected ?? firstStaffed?.id ?? outlets[0]?.id ?? null;

  const hq = HQ_ROLES.map((r) => ({ ...r, holder: byRole(users, r.role)[0] }));
  const storeCrew = STORE_ROLES.map((r) => ({
    ...r,
    holder: inBranch(byRole(users, r.role), HQ_BRANCH_ID)[0],
  }));

  const enter = (userId: string | undefined, href: Href) => {
    if (!userId) return;
    signIn(userId);
    router.push(href);
  };

  // Boot holds here while a stored session is checked, so the login form does
  // not flash in front of someone who is already signed in.
  if (status === 'restoring') {
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <ActivityIndicator color={C.ink5} />
      </View>
    );
  }

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
          {isSupabaseConfigured
            ? 'Log masuk dengan nombor pekerja. Apa yang anda nampak ditentukan oleh peranan anda.'
            : 'SV/AS dan Area Manager hanya melihat pekerja di cawangan mereka sendiri. Stor pusat di HQ menerima pulangan dari semua cawangan.'}
        </Text>

        {isSupabaseConfigured ? (
          <SignInForm />
        ) : (
          <>
          <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-5 mb-2">
            Cawangan · {outlets.length}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {outlets.map((b) => {
              const on = b.id === branchId;
              const staffed = users.some((u) => u.active && u.branchId === b.id);
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setSelected(b.id)}
                  accessibilityRole="button"
                  className="px-2.5 py-2 rounded-lg border"
                  style={{
                    borderColor: on ? 'transparent' : C.line,
                    backgroundColor: on ? C.ink : C.card,
                    opacity: on || staffed ? 1 : 0.55,
                  }}
                >
                  <Text
                    className="font-sans-med text-[12px]"
                    style={{ color: on ? '#fff' : staffed ? C.ink3 : C.ink6 }}
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

          <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-6 mb-2">
            Stor pusat · HQ Jenjarom
          </Text>
          <View className="gap-2.5">
            {storeCrew.map(({ role, href, holder }) => (
              <Pressable
                key={role}
                onPress={() => enter(holder?.id, href)}
                disabled={!holder}
                accessibilityRole="button"
                className="bg-card border border-line rounded-[14px] p-[18px] active:opacity-70"
                style={{ opacity: holder ? 1 : 0.5 }}
              >
                <MonoLabel>{ROLE_LABEL[role].toUpperCase()}</MonoLabel>
                <Text className="font-sans-semi text-[16px] text-ink mt-2">
                  {holder ? `${holder.name} · ${holder.id}` : 'Tiada pemegang'}
                </Text>
                <Text className="font-sans text-[13px] leading-5 text-ink-4 mt-1.5">
                  {ROLE_BLURB[role]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-6 mb-2">
            Ibu pejabat · semua cawangan
          </Text>
          <View className="gap-2.5">
            {hq.map(({ role, href, holder }) => (
              <Pressable
                key={role}
                onPress={() => enter(holder?.id, href)}
                disabled={!holder}
                accessibilityRole="button"
                className="bg-card border border-line rounded-[14px] p-[18px] active:opacity-70"
                style={{ opacity: holder ? 1 : 0.5 }}
              >
                <MonoLabel>{ROLE_LABEL[role].toUpperCase()}</MonoLabel>
                <Text className="font-sans-semi text-[16px] text-ink mt-2">
                  {holder ? `${holder.name} · ${holder.id}` : 'Tiada pemegang'}
                </Text>
                <Text className="font-sans text-[13px] leading-5 text-ink-4 mt-1.5">
                  {ROLE_BLURB[role]}
                </Text>
              </Pressable>
            ))}
          </View>
          </>
        )}

      </ScrollView>
    </View>
  );
}
