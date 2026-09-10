import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { todayShort } from '@/data/period';
import { MONTHS, WEEK_COLS } from '@/data/checklist';
import { useBranchLabel } from '@/store/useBranches';
import { useUsers } from '@/store/useUsers';
import { TUGASAN_ITEMS, tugasanScope } from '@/data/tugasan';
import { Screen } from '@/components/Screen';
import { useMarks } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import {
  tugasanDoneCount,
  tugasanEntry,
  tugasanSignOff,
  useTugasan,
} from '@/store/useTugasan';
import { C } from '@/theme/scoring';
import { SignOutButton } from '@/components/SignOutButton';



export default function Tugasan() {
  const monthIdx = useMarks((s) => s.monthIdx);
  const entriesByMonth = useTugasan((s) => s.entriesByMonth);
  const signOffByMonth = useTugasan((s) => s.signOffByMonth);
  const toggle = useTugasan((s) => s.toggle);
  const setNote = useTugasan((s) => s.setNote);
  const setTarikh = useTugasan((s) => s.setTarikh);
  const setDiperiksaOleh = useTugasan((s) => s.setDiperiksaOleh);

  const users = useUsers((s) => s.users);
  const manager = currentUser(users, useSession((s) => s.currentUserId));
  const managerName = manager?.name ?? 'Area Manager';
  const branchId = manager?.branchId ?? null;
  // The self-check is the Area Manager's own. Head office reads whether it was
  // done and never fills it in, which is what the RLS policy enforces too — so
  // an account that reached this screen by URL gets it read-only.
  const canFill = manager?.role === 'area_manager' || manager?.role === 'admin';
  const scope = tugasanScope(branchId, monthIdx);
  const branchLabel = useBranchLabel();

  const [openKey, setOpenKey] = useState<string | null>(null);

  const totalTicks = WEEK_COLS.length * TUGASAN_ITEMS.length;
  const doneTicks = WEEK_COLS.reduce(
    (n, _, i) => n + tugasanDoneCount(entriesByMonth, scope, i),
    0
  );

  return (
    <Screen>
      <MonoLabel>{branchLabel(branchId)} · Tugasan Area Manager</MonoLabel>
      <Text className="font-sans-semi text-2xl text-ink mt-2">{MONTHS[monthIdx]}</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {canFill
          ? `Pemeriksaan sendiri oleh ${managerName}`
          : 'Pemeriksaan sendiri Area Manager cawangan'}{' '}
        — bukan dinilai oleh SV/AS. {doneTicks}/{totalTicks} semakan selesai bulan ini.
      </Text>

      {!canFill && (
        <View
          className="mt-3 rounded-[10px] px-3.5 py-3 border"
          style={{ backgroundColor: C.warnBg, borderColor: C.warnLine }}
        >
          <Text className="font-sans-med text-[12.5px] leading-[19px]" style={{ color: C.warnInk }}>
            Paparan sahaja. Tugasan ini diisi oleh Area Manager cawangan sendiri.
          </Text>
        </View>
      )}

      <View className="gap-2.5 mt-[18px]">
        {TUGASAN_ITEMS.map((item, idx) => {
          const doneCount = WEEK_COLS.filter(
            (_, i) => tugasanEntry(entriesByMonth, scope, item.key, i).done
          ).length;
          return (
            <Card key={item.key} className="px-[15px] py-3.5">
              <View className="flex-row items-center gap-3">
                <View
                  className="w-[22px] h-[22px] rounded-md items-center justify-center"
                  style={{ backgroundColor: doneCount === WEEK_COLS.length ? C.passBg : '#EFEFEC' }}
                >
                  <Text
                    className="font-mono-semi text-[11px]"
                    style={{ color: doneCount === WEEK_COLS.length ? C.pass : C.ink5 }}
                  >
                    {idx === 0 ? 'A' : 'B'}
                  </Text>
                </View>
                <Text className="flex-1 font-sans-semi text-[13.5px] text-ink">
                  {item.label}
                </Text>
                <Text className="font-mono-semi text-xs text-ink-6">
                  {doneCount}/{WEEK_COLS.length}
                </Text>
              </View>

              <View className="gap-2 mt-3.5">
                {WEEK_COLS.map((w, weekIdx) => {
                  const key = `${item.key}-${weekIdx}`;
                  const entry = tugasanEntry(entriesByMonth, scope, item.key, weekIdx);
                  const open = openKey === key;
                  return (
                    <View
                      key={weekIdx}
                      className="bg-app rounded-[10px] px-3 py-2.5 border border-[#EAEAE7]"
                    >
                      <Pressable
                        onPress={() => setOpenKey(open ? null : key)}
                        accessibilityRole="button"
                        className="flex-row items-center gap-2.5"
                      >
                        <Pressable
                          onPress={() =>
                            toggle(scope, item.key, weekIdx, todayShort(), managerName)
                          }
                          disabled={!canFill}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: entry.done, disabled: !canFill }}
                          hitSlop={6}
                          className="w-5 h-5 rounded-md items-center justify-center border"
                          style={{
                            borderColor: entry.done ? 'transparent' : C.line,
                            backgroundColor: entry.done ? C.pass : '#fff',
                          }}
                        >
                          {entry.done && (
                            <Text className="text-white text-[11px] leading-none">✓</Text>
                          )}
                        </Pressable>
                        <Text className="flex-1 font-sans-med text-[12.5px] text-ink-2">
                          Minggu {weekIdx + 1} · {w}
                        </Text>
                        {entry.done && !!entry.note && (
                          <Text
                            className="font-mono-med text-[11.5px]"
                            style={{ color: item.noteKind === 'amount' ? C.ink : C.pass }}
                            numberOfLines={1}
                          >
                            {entry.note}
                          </Text>
                        )}
                        <Text className="font-mono text-[10.5px] text-ink-6">
                          {entry.tarikh || '—'}
                        </Text>
                      </Pressable>

                      {open && (
                        <View className="mt-2.5 gap-2 pl-[30px]">
                          <View>
                            <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mb-1.5">
                              {item.noteKind === 'amount' ? 'Catatan (RM)' : 'Catatan'}
                            </Text>
                            <TextInput
                              value={entry.note}
                              onChangeText={(t) => setNote(scope, item.key, weekIdx, t)}
                              placeholder={
                                item.noteKind === 'amount' ? 'cth: RM4,000' : 'cth: SALES OK'
                              }
                              placeholderTextColor={C.ink6}
                              className="bg-card border border-line rounded-lg px-2.5 py-2 font-sans text-[12.5px] text-ink-2"
                            />
                          </View>
                          <View>
                            <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mb-1.5">
                              Tarikh pemeriksaan
                            </Text>
                            <TextInput
                              value={entry.tarikh}
                              onChangeText={(t) => setTarikh(scope, item.key, weekIdx, t)}
                              placeholder={todayShort()}
                              placeholderTextColor={C.ink6}
                              className="bg-card border border-line rounded-lg px-2.5 py-2 font-mono text-[12px] text-ink-2"
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </View>

      <Card className="p-[15px] mt-2.5">
        <MonoLabel>Pengesahan mingguan</MonoLabel>
        <View className="flex-row gap-1.5 mt-3.5" style={{ paddingLeft: 96 }}>
          {WEEK_COLS.map((w) => (
            <Text
              key={w}
              className="flex-1 text-center font-mono-med text-[10px] text-ink-5"
            >
              {w}
            </Text>
          ))}
        </View>

        <SignOffRow label="Diisikan oleh" scope={scope} field="diisikanOleh" />
        <SignOffRow
          label="Diperiksa oleh"
          scope={scope}
          field="diperiksaOleh"
          editable
          onEdit={setDiperiksaOleh}
        />
        <SignOffRow label="Tarikh" scope={scope} field="tarikh" />

        <Text className="font-sans text-xs leading-[17px] text-ink-4 mt-3.5 pt-3 border-t border-rule">
          Diisikan oleh diisi automatik apabila tugasan minggu itu ditanda. Diperiksa oleh
          kekal kosong sehingga disahkan — sama seperti lajur MANAGER pada checklist lain.
        </Text>
      </Card>

      <SignOutButton />
    </Screen>
  );
}

function SignOffRow({
  label,
  scope,
  field,
  editable,
  onEdit,
}: {
  label: string;
  scope: string;
  field: 'diisikanOleh' | 'diperiksaOleh' | 'tarikh';
  editable?: boolean;
  onEdit?: (scope: string, weekIdx: number, value: string) => void;
}) {
  const signOffByMonth = useTugasan((s) => s.signOffByMonth);

  return (
    <View className="flex-row items-center gap-1.5 mt-2">
      <Text className="font-sans-med text-[11.5px] text-ink-3" style={{ width: 96 }}>
        {label}
      </Text>
      {WEEK_COLS.map((_, weekIdx) => {
        const so = tugasanSignOff(signOffByMonth, scope, weekIdx);
        const value = so[field];
        if (editable) {
          return (
            <TextInput
              key={weekIdx}
              value={value}
              onChangeText={(t) => onEdit?.(scope, weekIdx, t)}
              placeholder="—"
              placeholderTextColor={C.ink6}
              className="flex-1 text-center border-b border-line py-1 font-sans text-[11px] text-ink-2"
            />
          );
        }
        return (
          <Text
            key={weekIdx}
            className="flex-1 text-center font-mono text-[10.5px] text-ink-4"
            numberOfLines={1}
          >
            {value || '—'}
          </Text>
        );
      })}
    </View>
  );
}
