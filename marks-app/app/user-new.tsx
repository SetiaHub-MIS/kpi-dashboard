import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { isHq } from '@/data/branches';
import {
  ROLE_LADDER,
  Role,
  emailBlocker,
  hiringScope,
  isCentralStore,
  isCrossBranch,
  newUserBlocker,
  postingFor,
} from '@/data/users';
import { roleBlurb, roleLabel } from '@/i18n/labels';
import { payrollBlocker } from '@/lib/auth';
import { useActiveBranches, useBranchLabel } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

/**
 * One form, two reaches. Admin creates any role at any outlet, as before. An
 * SV/AS or Area Manager gets the same form with the role pinned to pekerja
 * kedai and the branch pinned to the outlets they cover — the shape RLS
 * enforces underneath (users_insert_branch_staff), so what the screen offers
 * and what the database accepts are the same thing.
 */
export default function NewUser() {
  const users = useUsers((s) => s.users);
  const addUser = useUsers((s) => s.addUser);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const scope = hiringScope(me);
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const branchLabel = useBranchLabel();

  const pinnedRole: Role | null = scope.kind === 'branch' ? scope.role : null;

  const [name, setName] = useState('');
  const [pickedRole, setPickedRole] = useState<Role>('staff');
  const role = pinnedRole ?? pickedRole;

  const allBranches = useActiveBranches();
  // Scope order, not list order: an Area Manager hiring staff sees their home
  // posting first. Admin sees every outlet — except that the stor team is
  // posted to HQ and nobody else is, so HQ is offered to them alone.
  const branches =
    scope.kind === 'branch'
      ? scope.branchIds.flatMap((id) => allBranches.filter((b) => b.id === id))
      : allBranches.filter((b) => isHq(b.id) === isCentralStore(role));

  // Head office holds no branch. An Area Manager may hold several — the first
  // picked is the home posting, the rest go to user_branches — so nothing is
  // pre-selected for them: the home outlet must be a deliberate tap, not
  // whichever kedai happens to sort first. Everyone else gets exactly one.
  const crossBranch = isCrossBranch(role);
  const multi = scope.kind === 'any' && role === 'area_manager';
  const [picked, setPicked] = useState<string[]>([]);
  const effectivePicked =
    picked.length > 0 ? picked : multi ? [] : branches[0] ? [branches[0].id] : [];
  const posting = postingFor(role, effectivePicked);
  const toggleBranch = (id: string) => {
    setError(null);
    if (!multi) {
      setPicked([id]);
      return;
    }
    setPicked((prev) => {
      const current = prev.length > 0 ? prev : effectivePicked;
      return current.includes(id) ? current.filter((b) => b !== id) : [...current, id];
    });
  };
  const [customId, setCustomId] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Never generated: the number is payroll's, and its prefix follows the
  // outlet and position (MC for a DMC pekerja, KP for BKP, HQ for head
  // office), not the role. Whoever adds the person types the one HR issued,
  // and the primary key has the final say on collisions.
  const id = customId.trim().toUpperCase();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const submit = async () => {
    const blocked = newUserBlocker(users, name, id) ?? payrollBlocker(id) ?? emailBlocker(email);
    if (blocked) {
      setError(blocked);
      return;
    }
    if (!crossBranch && posting.branchId == null) {
      setError(t('pilih_satu_cawangan'));
      return;
    }
    setBusy(true);
    try {
      const result = await addUser({
        name,
        id,
        role,
        branchId: posting.branchId,
        extraBranchIds: posting.extraBranchIds,
        email: email.trim() || null,
      });
      if (!result.ok) {
        setError(
          result.reason === 'duplicate'
            ? t('no_pekerja_sudah_digunakan', { id })
            : result.reason === 'forbidden'
              ? t('tambah_ditolak_pelayan')
              : t('tambah_gagal')
        );
        return;
      }
      if (result.coverageError) {
        Alert.alert(
          t('liputan_gagal_title'),
          t('liputan_gagal_body', { name: name.trim(), home: branchLabel(posting.branchId) })
        );
      }
      if (scope.kind === 'any') router.replace(`/user/${id}`);
      else goBack();
    } finally {
      setBusy(false);
    }
  };

  if (scope.kind === 'none') {
    return (
      <Screen>
        <BackLink label={t('kembali')} />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">{t('akaun_baharu')}</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          {t('tak_boleh_tambah_akaun')}
        </Text>
      </Screen>
    );
  }

  const branchMode = scope.kind === 'branch';

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <BackLink label={branchMode ? t('kembali') : t('tab_pengguna')} />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">
          {branchMode ? t('pekerja_baharu') : t('akaun_baharu')}
        </Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          {branchMode ? t('pekerja_baharu_intro') : t('akaun_baharu_intro')}
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
          {branchMode ? (
            <View className="mt-2.5">
              <Text className="font-sans-semi text-[13px] text-ink">{roleLabel(role, locale)}</Text>
              <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-1">
                {roleBlurb(role, locale)}
              </Text>
            </View>
          ) : (
            <View className="gap-1.5 mt-2.5">
              {ROLE_LADDER.map((r) => {
                const on = role === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setPickedRole(r);
                      // A multi-outlet pick must not leak into a one-outlet role.
                      setPicked([]);
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
          )}
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('tab_cawangan')}</MonoLabel>
          {crossBranch ? (
            <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2.5">
              {t('semua_cawangan_hint')}
            </Text>
          ) : branches.length === 1 ? (
            <Text className="font-sans-semi text-[13px] text-ink mt-2.5">
              {branchLabel(branches[0].id)}
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-1.5 mt-2.5">
              {branches.map((b) => {
                const on = effectivePicked.includes(b.id);
                const home = multi && on && effectivePicked[0] === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => toggleBranch(b.id)}
                    accessibilityRole={multi ? 'checkbox' : 'radio'}
                    accessibilityState={multi ? { checked: on } : { selected: on }}
                    className="px-3 py-2 rounded-lg border items-center"
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
                    {home && (
                      <Text className="font-mono-semi text-[8px] mt-0.5" style={{ color: C.ink7 }}>
                        {t('cawangan_utama_badge')}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
          {!branchMode && !crossBranch && branches.length > 1 && (
            <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
              {multi ? t('liputan_hint') : t('cawangan_hint_sv')}
            </Text>
          )}
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('no_pekerja')}</MonoLabel>
          <TextInput
            value={customId}
            onChangeText={(text) => {
              setCustomId(text);
              setError(null);
            }}
            placeholder={t('contoh_no_pekerja')}
            placeholderTextColor={C.ink6}
            autoCapitalize="characters"
            autoCorrect={false}
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-mono text-[13px] text-ink"
          />
          <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
            {t('no_pekerja_dari_hr')}
          </Text>
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('emel_pilihan')}</MonoLabel>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            placeholder={t('contoh_emel')}
            placeholderTextColor={C.ink6}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
          />
          <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
            {t('emel_hint')}
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
          disabled={busy}
          accessibilityRole="button"
          className="mt-3.5 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-sans-semi text-sm text-white">
              {branchMode ? t('cipta_akaun') : t('cipta_akaun_role', { role: roleLabel(role, locale) })}
            </Text>
          )}
        </Pressable>

        {branchMode && (
          <Text className="font-sans text-[12px] leading-[18px] text-ink-5 mt-3.5">
            {t('login_dibuat_admin')}
          </Text>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
