import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { isHq } from '@/data/branches';
import { WEEK_COLS } from '@/data/checklist';
import { useActiveBranches, useBranchLabel } from '@/store/useBranches';
import {
  branchChangeBlocker,
  branchesOf,
  ROLE_LADDER,
  ROLE_LEVEL,
  Role,
  deactivateBlocker,
  demotionsFor,
  emailBlocker,
  isCentralStore,
  isCrossBranch,
  isMarked,
  promotionsFor,
  roleChangeBlocker,
  transfersFor,
} from '@/data/users';
import { formLabel, roleBlurb, roleLabel } from '@/i18n/labels';
import { WriteResult } from '@/lib/directory';
import { formKeyForRole, useMarks, weekMark } from '@/store/useMarks';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { findUser, useUsers } from '@/store/useUsers';
import { C, pctColor } from '@/theme/scoring';

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useUsers((s) => s.users);
  const setRole = useUsers((s) => s.setRole);
  const setPosting = useUsers((s) => s.setPosting);
  const setActive = useUsers((s) => s.setActive);
  const setEmail = useUsers((s) => s.setEmail);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const submitted = useMarks((s) => s.submitted);
  const passThreshold = useMarks((s) => s.passThreshold);
  const allBranches = useActiveBranches();
  const branchLabel = useBranchLabel();
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const [saving, setSaving] = useState(false);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);

  const user = findUser(users, id);

  if (!user) {
    return (
      <Screen>
        <BackLink label={t('tab_pengguna')} />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">
          {t('akaun_tidak_dijumpai')}
        </Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          {t('akaun_tiada_senarai_pengguna', { id: id ?? '' })}
        </Text>
      </Screen>
    );
  }

  const up = promotionsFor(user.role);
  const down = demotionsFor(user.role);
  const sideways = transfersFor(user.role);
  // Highest rung first; a rung can hold peer roles (pekerja kedai and stor).
  const levels = [...new Set(ROLE_LADDER.map((r) => ROLE_LEVEL[r]))].sort((a, b) => b - a);

  // Every write goes to Postgres before the screen changes, so a refusal is
  // shown rather than silently reverted on the next reload.
  const persist = async (write: () => Promise<WriteResult>) => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await write();
      if (!result.ok) {
        Alert.alert(
          t('perubahan_tak_disimpan'),
          result.reason === 'forbidden' ? t('perubahan_ditolak_pelayan') : result.message
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const change = (next: Role) => {
    const blocked = roleChangeBlocker(users, user.id, next);
    if (blocked) {
      Alert.alert(t('tak_boleh_tukar_peranan'), blocked);
      return;
    }
    void persist(() => setRole(user.id, next, me?.id ?? null));
  };

  // Which outlets this person may be posted to: the stor team to HQ alone,
  // everyone with a kedai posting to the kedai list. Same rule as creation.
  const branches = allBranches.filter((b) => isHq(b.id) === isCentralStore(user.role));
  const multi = user.role === 'area_manager';
  const covered = branchesOf(user);

  const tapBranch = (next: string) => {
    let picked: string[];
    if (!multi) {
      picked = [next];
    } else if (covered.includes(next)) {
      picked = covered.filter((b) => b !== next);
      if (picked.length === 0) {
        Alert.alert(t('tak_boleh_tukar_cawangan'), t('cawangan_terakhir'));
        return;
      }
    } else {
      picked = [...covered, next];
    }
    const [home, ...extras] = picked;
    if (home !== user.branchId) {
      const blocked = branchChangeBlocker(users, user.id, home);
      if (blocked) {
        Alert.alert(t('tak_boleh_tukar_cawangan'), blocked);
        return;
      }
    }
    void persist(() => setPosting(user.id, home, extras, me?.id ?? null));
  };

  const toggleActive = () => {
    if (user.active) {
      const blocked = deactivateBlocker(users, user.id);
      if (blocked) {
        Alert.alert(t('tak_boleh_nyahaktif'), blocked);
        return;
      }
    }
    void persist(() => setActive(user.id, !user.active));
  };

  const emailValue = emailDraft ?? user.email ?? '';
  const emailDirty = emailValue.trim().toLowerCase() !== (user.email ?? '');
  const saveEmail = () => {
    const blocked = emailBlocker(emailValue);
    if (blocked) {
      Alert.alert(t('perubahan_tak_disimpan'), blocked);
      return;
    }
    void persist(async () => {
      const result = await setEmail(user.id, emailValue.trim() || null);
      if (result.ok) setEmailDraft(null);
      return result;
    });
  };

  const marks = user.w
    .map((_, i) => weekMark(user, i, submitted))
    .filter((v): v is number => v != null);

  return (
    <Screen>
      <BackLink label={t('tab_pengguna')} />

      <View className="flex-row gap-3 items-center mt-4">
        <Avatar init={user.init} size={46} />
        <View className="flex-1 min-w-0">
          <Text className="font-sans-semi text-[18px] text-ink">{user.name}</Text>
          <Text className="font-mono text-xs text-ink-5 mt-1">
            {user.id} · {roleLabel(user.role, locale)} · {branchLabel(user.branchId)}
            {user.active ? '' : t('nyahaktif_suffix')}
          </Text>
        </View>
      </View>

      <Card className="p-[15px] mt-4">
        <MonoLabel>{t('tab_peranan')}</MonoLabel>
        <View className="gap-1.5 mt-3">
          {levels.map((level) => (
            <View key={level} className="flex-row gap-1.5">
              {ROLE_LADDER.filter((r) => ROLE_LEVEL[r] === level).map((r) => {
                const current = r === user.role;
                return (
                  <View
                    key={r}
                    className="flex-1 rounded-[10px] px-3 py-2.5 border"
                    style={{
                      borderColor: current ? C.ink : C.line,
                      backgroundColor: current ? C.rule : C.card,
                    }}
                  >
                    <View className="flex-row items-center gap-2.5">
                      <View
                        className="w-[7px] h-[7px] rounded-full"
                        style={{ backgroundColor: current ? C.ink : C.ink8 }}
                      />
                      <Text
                        className={
                          current
                            ? 'flex-1 font-sans-semi text-[12.5px] text-ink'
                            : 'flex-1 font-sans-med text-[12.5px] text-ink-4'
                        }
                        numberOfLines={1}
                      >
                        {roleLabel(r, locale)}
                      </Text>
                      {current && (
                        <Text className="font-mono-semi text-[9px] text-ink-5">{t('kini_badge')}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-3">
          {roleBlurb(user.role, locale)}
        </Text>

        {up.length > 0 && (
          <View className="flex-row gap-2 mt-3.5">
            {up.map((r) => (
              <Pressable
                key={r}
                onPress={() => change(r)}
                disabled={saving}
                accessibilityRole="button"
                className="flex-1 py-3 rounded-[10px] items-center bg-ink active:opacity-80"
              >
                <Text className="font-sans-semi text-[12.5px] text-white">
                  {t('naik_ke', { role: roleLabel(r, locale) })}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {down.length > 0 && (
          <View className="flex-row gap-2 mt-2">
            {down.map((r) => (
              <Pressable
                key={r}
                onPress={() => change(r)}
                disabled={saving}
                accessibilityRole="button"
                className="flex-1 py-3 rounded-[10px] border border-line items-center bg-card active:opacity-70"
              >
                <Text className="font-sans-semi text-[12.5px] text-ink-2">
                  {t('turun_ke', { role: roleLabel(r, locale) })}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {sideways.length > 0 && (
          <View className="flex-row gap-2 mt-2">
            {sideways.map((r) => (
              <Pressable
                key={r}
                onPress={() => change(r)}
                disabled={saving}
                accessibilityRole="button"
                className="flex-1 py-3 rounded-[10px] border border-line items-center bg-card active:opacity-70"
              >
                <Text className="font-sans-semi text-[12.5px] text-ink-3">
                  {t('tukar_ke', { role: roleLabel(r, locale) })}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      <Card className="p-[15px] mt-2.5">
        <MonoLabel>{t('tab_cawangan')}</MonoLabel>
        {isCrossBranch(user.role) ? (
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2.5">
            {t('semua_cawangan_hint')}
          </Text>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-1.5 mt-3">
              {branches.map((b) => {
                const on = covered.includes(b.id);
                const home = multi && on && user.branchId === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => tapBranch(b.id)}
                    disabled={saving}
                    accessibilityRole={multi ? 'checkbox' : 'radio'}
                    accessibilityState={multi ? { checked: on } : { selected: on }}
                    className="px-3 py-2 rounded-lg border items-center"
                    style={{
                      borderColor: on ? 'transparent' : C.line,
                      backgroundColor: on ? C.ink : C.card,
                      opacity: saving ? 0.6 : 1,
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
            {multi && (
              <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
                {t('liputan_edit_hint')}
              </Text>
            )}
          </>
        )}
      </Card>

      <Card className="p-[15px] mt-2.5">
        <MonoLabel>{t('emel')}</MonoLabel>
        <TextInput
          value={emailValue}
          onChangeText={setEmailDraft}
          placeholder={t('contoh_emel')}
          placeholderTextColor={C.ink6}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          editable={!saving}
          className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
        />
        <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-2">
          {user.email ? t('emel_hint') : t('tiada_emel')}
        </Text>
        <Pressable
          onPress={saveEmail}
          disabled={!emailDirty || saving}
          accessibilityRole="button"
          className="mt-3 py-2.5 rounded-[10px] items-center"
          style={{ backgroundColor: emailDirty && !saving ? C.ink : C.line }}
        >
          <Text
            className="font-sans-semi text-[12.5px]"
            style={{ color: emailDirty && !saving ? '#fff' : C.ink6 }}
          >
            {t('simpan_emel')}
          </Text>
        </Pressable>
      </Card>

      {isMarked(user.role) ? (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>
            {t('markah_mingguan')} · {formLabel(formKeyForRole(user.role), locale)}
          </MonoLabel>
          <View className="flex-row gap-1.5 mt-3">
            {WEEK_COLS.map((w, i) => {
              const v = weekMark(user, i, submitted);
              return (
                <View key={w} className="flex-1 items-center">
                  <Text className="font-mono-med text-[10px] text-ink-5 mb-1.5">{w}</Text>
                  <View
                    className="w-full h-[30px] rounded-md items-center justify-center"
                    style={
                      v == null
                        ? { borderWidth: 1, borderStyle: 'dashed', borderColor: '#D6D6D2' }
                        : { backgroundColor: C.rule }
                    }
                  >
                    <Text
                      className="font-mono-semi text-[11.5px]"
                      style={{ color: v == null ? C.ink7 : pctColor(v, passThreshold) }}
                    >
                      {v == null ? '–' : v}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          <Pressable
            onPress={() => router.push(`/person/${user.id}`)}
            accessibilityRole="button"
            className="mt-3 py-2.5 rounded-[10px] border border-line items-center active:opacity-70"
          >
            <Text className="font-sans-semi text-[12.5px] text-ink-2">
              {t('lihat_rekod_penuh')}
            </Text>
          </Pressable>
        </Card>
      ) : (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('markah_mingguan')}</MonoLabel>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2.5">
            {t('role_tidak_dinilai', { role: roleLabel(user.role, locale) })}
            {marks.length > 0 ? t('rekod_lama_pekerja', { count: marks.length }) : ''}
          </Text>
        </Card>
      )}

      <Pressable
        onPress={toggleActive}
        disabled={saving}
        accessibilityRole="button"
        className="mt-2.5 py-3.5 rounded-xl border items-center bg-card active:opacity-70"
        style={{ borderColor: user.active ? '#D6D6D2' : C.pass }}
      >
        <Text
          className="font-sans-semi text-sm"
          style={{ color: user.active ? C.fail : C.pass }}
        >
          {user.active ? t('nyahaktifkan_akaun') : t('aktifkan_semula_akaun')}
        </Text>
      </Pressable>
    </Screen>
  );
}
