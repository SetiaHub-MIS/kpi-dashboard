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
import { ACTIVE_WEEK, FORM_LABEL, countLines, lineKey } from '@/data/checklist';
import { findUser, useUsers } from '@/store/useUsers';
import { draftTotals, formForRole, formKeyForRole, useMarks } from '@/store/useMarks';
import { C, bandColor, pctColor } from '@/theme/scoring';

export default function MarkPerson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useUsers((s) => s.users);
  const person = findUser(users, id);
  const insets = useSafeAreaInsets();

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

  if (!person) {
    return (
      <Screen>
        <BackLink label="Checklist" />
        <Text className="font-sans-semi text-[19px] text-ink mt-4">
          Pekerja tidak dijumpai
        </Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          Akaun {id} tiada dalam senarai pengguna.
        </Text>
      </Screen>
    );
  }

  const submit = () => {
    if (!totals.complete) return;
    submitDraft();
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
        <BackLink label="Batal" />

        <View className="flex-row gap-3 items-center mt-4">
          <Avatar init={person.init} size={40} />
          <View className="min-w-0 flex-1">
            <Text className="font-sans-semi text-[17px] text-ink">{person.name}</Text>
            <Text className="font-mono text-[11px] text-ink-5 mt-1">
              {person.id} · Minggu {ACTIVE_WEEK + 1} · skala 1–{scaleMax}
            </Text>
            <Text className="font-sans-med text-[11.5px] text-ink-4 mt-1">
              {FORM_LABEL[formKey]} · {lineCount} perkara
            </Text>
          </View>
        </View>

        <View className="gap-2 mt-4">
          {form.map((k) => {
            const open = draft.openKat === k.no;
            const vals = k.lines
              .map((_, i) => draft.scores[lineKey(k.no, i)])
              .filter((v): v is number => v != null);
            const done = vals.length === k.lines.length;
            const katPct = vals.length
              ? Math.round((vals.reduce((a, b) => a + b, 0) / (k.lines.length * scaleMax)) * 100)
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
                    {katPct == null
                      ? `0/${k.lines.length}`
                      : done
                        ? `${katPct}%`
                        : `${vals.length}/${k.lines.length}`}
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
                                  accessibilityLabel={`${label}: ${v}`}
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
                        Semua {scaleMax - 1}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })}

          <Card className="p-[15px]">
            <Text className="font-sans-semi text-[13px] text-ink">Catatan</Text>
            <TextInput
              value={draft.noteText}
              onChangeText={setNoteText}
              placeholder="Tulis atau pilih catatan…"
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
            Jumlah markah
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
              ? 'Hantar markah'
              : `${totals.filled}/${lineCount} perkara diisi`}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
