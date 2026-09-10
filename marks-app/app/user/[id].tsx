import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { todayShort } from '@/data/period';
import { Avatar } from '@/components/Avatar';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { WEEK_COLS } from '@/data/checklist';
import { useActiveBranches, useBranchLabel } from '@/store/useBranches';
import {
  branchChangeBlocker,
  ROLE_LADDER,
  ROLE_LEVEL,
  Role,
  deactivateBlocker,
  demotionsFor,
  isMarked,
  promotionsFor,
  roleChangeBlocker,
  transfersFor,
} from '@/data/users';
import { formLabel, roleBlurb, roleLabel } from '@/i18n/labels';
import { formKeyForRole, useMarks, weekMark } from '@/store/useMarks';
import { useLocale, useT } from '@/store/useLocale';
import { findUser, useUsers } from '@/store/useUsers';
import { C, pctColor } from '@/theme/scoring';



export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useUsers((s) => s.users);
  const setRole = useUsers((s) => s.setRole);
  const setBranch = useUsers((s) => s.setBranch);
  const setActive = useUsers((s) => s.setActive);
  const submitted = useMarks((s) => s.submitted);
  const passThreshold = useMarks((s) => s.passThreshold);
  const branches = useActiveBranches();
  const branchLabel = useBranchLabel();
  const t = useT();
  const locale = useLocale((s) => s.locale);

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

  const change = (next: Role) => {
    const blocked = roleChangeBlocker(users, user.id, next);
    if (blocked) {
      Alert.alert(t('tak_boleh_tukar_peranan'), blocked);
      return;
    }
    setRole(user.id, next, todayShort());
  };

  const moveBranch = (next: string) => {
    const blocked = branchChangeBlocker(users, user.id, next);
    if (blocked) {
      Alert.alert(t('tak_boleh_tukar_cawangan'), blocked);
      return;
    }
    setBranch(user.id, next);
  };

  const toggleActive = () => {
    if (user.active) {
      const blocked = deactivateBlocker(users, user.id);
      if (blocked) {
        Alert.alert(t('tak_boleh_nyahaktif'), blocked);
        return;
      }
    }
    setActive(user.id, !user.active);
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

      {user.role !== 'admin' && (
        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('tab_cawangan')}</MonoLabel>
          <View className="flex-row flex-wrap gap-1.5 mt-3">
            {branches.map((b) => {
              const on = user.branchId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => moveBranch(b.id)}
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
        </Card>
      )}

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
