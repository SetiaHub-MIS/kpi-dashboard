import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { BackLink } from '@/components/BackLink';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { NOTE_CHIPS } from '@/data/assets';
import { ACTIVE_WEEK, allowsNa, countLines, lineKey } from '@/data/checklist';
import { formLabel } from '@/i18n/labels';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { findUser, useUsers } from '@/store/useUsers';
import { draftTotals, formForRole, formKeyForRole, useMarks } from '@/store/useMarks';
import { C, bandColor, pctColor } from '@/theme/scoring';

export default function MarkPerson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useUsers((s) => s.users);
  const person = findUser(users, id);
  const me = currentUser(users, useSession((x) => x.currentUserId));
  const insets = useSafeAreaInsets();
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const draft = useMarks((s) => s.draft);
  const scaleMax = useMarks((s) => s.scaleMax);
  const passThreshold = useMarks((s) => s.passThreshold);
  const startMarking = useMarks((s) => s.startMarking);
  const toggleKat = useMarks((s) => s.toggleKat);
  const setScore = useMarks((s) => s.setScore);
  const fillKategori = useMarks((s) => s.fillKategori);
  const pickNoteChip = useMarks((s) => s.pickNoteChip);
  const setNoteText = useMarks((s) => s.setNoteText);
  const submitDraft = useMarks((s) => s.submitDraft);

  const formKey = person ? formKeyForRole(person.role) : 'kedai';
  const form = person ? formForRole(person.role) : [];
  const lineCount = countLines(form);

  // A deep link can land here without the queue having opened a draft first.
  useEffect(() => {
    if (person && draft.personId !== person.id) startMarking(person.id, formKey);
  }, [draft.personId, person, startMarking, formKey]);

  const totals = draftTotals({ draft, scaleMax });
  // Only the SV form has perkara that may not apply. The workbook shows two of
  // them blank all year, with the maximum moving to match.
  const naAllowed = allowsNa(formKey);

  if (!person) {
    return (
      <Screen>
        <BackLink label={t('tab_checklist')} />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">
          {t('pekerja_tak_dijumpai')}
        </Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          {t('akaun_tiada_senarai', { id })}
        </Text>
      </Screen>
    );
  }

  const submit = () => {
    if (!totals.complete) return;
    // The mark is filed against the person's branch, not the marker's: they are
    // the same for an SV/AS, and the person's is the one the record belongs to.
    // Not awaited — the local write has already happened, and the screen should
    // not hold the supervisor while the network decides.
    void submitDraft(
      me && person.branchId
        ? {
            branchId: person.branchId,
            scoredBy: me.id,
            nameOf: (uid: string) => findUser(users, uid)?.short ?? uid,
          }
        : undefined
    );
    router.replace({
      pathname: '/done',
      params: {
        id: person.id,
        pct: totals.pct,
        total: totals.total,
        max: totals.max,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-app"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 18,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackLink label={t('batal')} />

        <View className="flex-row gap-3 items-center mt-4">
          <Avatar init={person.init} size={40} />
          <View className="min-w-0 flex-1">
            <Text className="font-sans-semi text-[17px] text-ink">{person.name}</Text>
            <Text className="font-mono text-[11px] text-ink-5 mt-1">
              {person.id} · {t('minggu_skala', { week: ACTIVE_WEEK + 1, max: scaleMax })}
              {naAllowed ? t('na_dibenarkan_suffix') : ''}
            </Text>
            <Text className="font-sans-med text-[11.5px] text-ink-4 mt-1">
              {t('form_perkara_count', { form: formLabel(formKey, locale), count: lineCount })}
            </Text>
          </View>
        </View>

        <View className="gap-2 mt-4">
          {form.map((k) => {
            const open = draft.openKat === k.no;
            const answers = k.lines
              .map((_, i) => draft.scores[lineKey(k.no, i)])
              .filter((v) => v != null);
            // N/A counts as answered but contributes to neither side of the
            // percentage: a kategori where one line does not apply is scored
            // out of the lines that do.
            const vals = answers.filter((v): v is number => v !== 'na');
            const done = answers.length === k.lines.length;
            const katPct = vals.length
              ? Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * scaleMax)) * 100)
              : null;

            return (
              <Card
                key={k.no}
                className="px-[15px] py-3.5"
                style={{ borderColor: open ? '#C7C7C2' : C.line }}
              >
                <Pressable
                  onPress={() => toggleKat(k.no)}
                  accessibilityRole="button"
                  className="flex-row items-center gap-3"
                >
                  <View
                    className="w-[22px] h-[22px] rounded-md items-center justify-center"
                    style={{ backgroundColor: done ? C.passBg : '#EFEFEC' }}
                  >
                    <Text
                      className="font-mono-semi text-[11px]"
                      style={{ color: done ? C.pass : C.ink5 }}
                    >
                      {k.no}
                    </Text>
                  </View>
                  <Text className="flex-1 font-sans-semi text-[13.5px] leading-[18px] text-ink">
                    {k.name}
                  </Text>
                  <Text
                    className="font-mono-semi text-xs"
                    style={{
                      color: done && katPct != null ? pctColor(katPct, passThreshold) : C.ink6,
                    }}
                  >
                    {answers.length === 0
                      ? `0/${k.lines.length}`
                      : done
                        ? (katPct == null ? 'N/A' : `${katPct}%`)
                        : `${answers.length}/${k.lines.length}`}
                  </Text>
                </Pressable>

                {open && (
                  <View className="mt-3.5 gap-3.5">
                    {k.lines.map((label, i) => {
                      const key = lineKey(k.no, i);
                      const picked = draft.scores[key];
                      return (
                        <View key={key}>
                          <Text className="font-sans-med text-[12.5px] leading-[17px] text-ink-2">
                            {label}
                          </Text>
                          <View className="flex-row gap-1.5 mt-2.5">
                            {Array.from({ length: scaleMax }, (_, j) => j + 1).map((v) => {
                              const on = picked === v;
                              return (
                                <Pressable
                                  key={v}
                                  onPress={() => setScore(key, v)}
                                  accessibilityRole="button"
                                  accessibilityLabel={t('perkara_a11y', { label, value: v })}
                                  className="flex-1 py-2.5 rounded-lg items-center border"
                                  style={{
                                    borderColor: on ? 'transparent' : C.line,
                                    backgroundColor: on ? bandColor(v, scaleMax) : C.card,
                                  }}
                                >
                                  <Text
                                    className="font-mono-semi text-[12.5px]"
                                    style={{ color: on ? '#fff' : C.ink5 }}
                                  >
                                    {v}
                                  </Text>
                                </Pressable>
                              );
                            })}
                            {naAllowed && (
                              <Pressable
                                onPress={() => setScore(key, 'na')}
                                accessibilityRole="button"
                                accessibilityLabel={t('perkara_na_a11y', { label })}
                                className="px-2.5 py-2.5 rounded-lg items-center border"
                                style={{
                                  borderColor: picked === 'na' ? 'transparent' : C.line,
                                  backgroundColor: picked === 'na' ? C.ink5 : C.card,
                                }}
                              >
                                <Text
                                  className="font-mono-semi text-[12.5px]"
                                  style={{ color: picked === 'na' ? '#fff' : C.ink5 }}
                                >
                                  N/A
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      );
                    })}

                    <Pressable
                      onPress={() => fillKategori(k.no)}
                      accessibilityRole="button"
                      className="self-start px-3 py-2 rounded-lg border border-line bg-[#FAFAF9] active:opacity-70"
                    >
                      <Text className="font-sans-med text-xs text-ink-3">
                        {t('semua_n', { value: scaleMax - 1 })}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })}

          <Card className="p-[15px]">
            <Text className="font-sans-semi text-[13px] text-ink">{t('catatan')}</Text>
            <TextInput
              value={draft.noteText}
              onChangeText={setNoteText}
              placeholder={t('tulis_pilih_catatan')}
              placeholderTextColor={C.ink6}
              multiline
              className="bg-app border border-[#EAEAE7] rounded-[10px] p-3 mt-3 font-sans text-[13px] text-ink-2"
              style={{ minHeight: 62, textAlignVertical: 'top' }}
            />
            <View className="flex-row flex-wrap gap-1.5 mt-2.5">
              {NOTE_CHIPS.map((n) => {
                const on = draft.noteChip === n.key;
                return (
                  <Pressable
                    key={n.key}
                    onPress={() => pickNoteChip(n)}
                    accessibilityRole="button"
                    className="px-[11px] py-2 rounded-lg border"
                    style={{
                      borderColor: on ? 'transparent' : C.line,
                      backgroundColor: on ? C.ink : C.card,
                    }}
                  >
                    <Text
                      className="font-sans-med text-xs"
                      style={{ color: on ? '#fff' : C.ink3 }}
                    >
                      {n.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>
      </ScrollView>

      <View
        className="border-t border-line bg-card px-4 pt-3 flex-row items-center gap-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View>
          <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5">
            {t('jumlah_markah')}
          </Text>
          <View className="flex-row items-baseline gap-1 mt-1.5">
            <Text
              className="font-mono-semi text-[26px]"
              style={{
                color: totals.filled ? pctColor(totals.pct, passThreshold) : C.ink8,
              }}
            >
              {totals.total}
            </Text>
            <Text className="font-mono text-xs text-ink-6">
              /{totals.max} · {totals.pct}%
            </Text>
          </View>
        </View>

        <Pressable
          onPress={submit}
          disabled={!totals.complete}
          accessibilityRole="button"
          className="flex-1 py-[15px] rounded-xl items-center"
          style={{ backgroundColor: totals.complete ? C.ink : C.line }}
        >
          <Text
            className="font-sans-semi text-[15px]"
            style={{ color: totals.complete ? '#fff' : C.ink6 }}
          >
            {totals.complete
              ? t('hantar_markah')
              : t('n_perkara_diisi', { filled: totals.filled, total: lineCount })}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
