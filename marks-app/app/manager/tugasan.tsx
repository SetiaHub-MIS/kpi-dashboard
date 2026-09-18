import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { todayShort } from '@/data/period';
import { MONTHS, WEEK_COLS } from '@/data/checklist';
import { roleLabel } from '@/i18n/labels';
import { isHq } from '@/data/branches';
import { isCrossBranch } from '@/data/users';
import { useActiveBranches, useBranchLabel } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { findUser, useUsers } from '@/store/useUsers';
import { TUGASAN_ITEMS, tugasanScope } from '@/data/tugasan';
import { Screen } from '@/components/Screen';
import { useMarks } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import {
  WeekSignOff,
  tugasanDoneCount,
  tugasanEntry,
  tugasanSignOff,
  useTugasan,
} from '@/store/useTugasan';
import { notify } from '@/lib/dialog';
import { C } from '@/theme/scoring';
import { SignOutButton } from '@/components/SignOutButton';



export default function Tugasan() {
  const monthIdx = useMarks((s) => s.monthIdx);
  const entriesByMonth = useTugasan((s) => s.entriesByMonth);
  const signOffByMonth = useTugasan((s) => s.signOffByMonth);
  const toggle = useTugasan((s) => s.toggle);
  const setNote = useTugasan((s) => s.setNote);
  const setTarikh = useTugasan((s) => s.setTarikh);
  const commitEntry = useTugasan((s) => s.commitEntry);
  const stampChecked = useTugasan((s) => s.stampChecked);

  const users = useUsers((s) => s.users);
  const manager = currentUser(users, useSession((s) => s.currentUserId));
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const managerName = manager?.name ?? roleLabel('area_manager', locale);
  // The self-check is per outlet. An Area Manager fills their own outlet's;
  // the Manager, who has no home outlet, picks one — the same list the
  // policies let them write to (every outlet). Admin may fill in too; other
  // head-office roles that reach this screen by URL get it read-only.
  const crossBranch = manager != null && isCrossBranch(manager.role);
  const outlets = useActiveBranches().filter((b) => !isHq(b.id));
  const [pickedBranch, setPickedBranch] = useState<string | null>(null);
  const branchId = crossBranch ? pickedBranch : (manager?.branchId ?? null);
  const canFill =
    manager?.role === 'area_manager' || manager?.role === 'manager' || manager?.role === 'admin';
  const scope = tugasanScope(branchId, monthIdx);
  const branchLabel = useBranchLabel();
  const report = (result: { ok: boolean; message?: string }) => {
    if (!result.ok) notify(t('perubahan_tak_disimpan'), result.message);
  };
  const nameOf = (id: string | null) => (id ? (findUser(users, id)?.name ?? id) : '');

  const [openKey, setOpenKey] = useState<string | null>(null);

  const totalTicks = WEEK_COLS.length * TUGASAN_ITEMS.length;
  const doneTicks = WEEK_COLS.reduce(
    (n, _, i) => n + tugasanDoneCount(entriesByMonth, scope, i),
    0
  );

  return (
    <Screen>
      <MonoLabel>
        {t('tugasan_am_label', { branch: branchId ? branchLabel(branchId) : t('semua_cawangan') })}
      </MonoLabel>
      <Text className="font-sans-semi text-2xl text-ink mt-2">{MONTHS[monthIdx]}</Text>

      {crossBranch && (
        <View className="mt-3">
          <Text className="font-sans text-[12.5px] leading-[18px] text-ink-4">
            {t('pilih_cawangan_tugasan')}
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {outlets.map((b) => {
              const on = pickedBranch === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setPickedBranch(b.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  className="px-3 py-2 rounded-lg border items-center"
                  style={{
                    borderColor: on ? 'transparent' : C.line,
                    backgroundColor: on ? C.ink : C.card,
                  }}
                >
                  <Text className="font-sans-med text-[12.5px]" style={{ color: on ? '#fff' : C.ink3 }}>
                    {b.short}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {crossBranch && !branchId ? null : (
      <>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {canFill ? t('pemeriksaan_sendiri_nama', { name: managerName }) : t('pemeriksaan_sendiri_am')}
        {t('tugasan_status_suffix', { done: doneTicks, total: totalTicks })}
      </Text>

      {!canFill && (
        <View
          className="mt-3 rounded-[10px] px-3.5 py-3 border"
          style={{ backgroundColor: C.warnBg, borderColor: C.warnLine }}
        >
          <Text className="font-sans-med text-[12.5px] leading-[19px]" style={{ color: C.warnInk }}>
            {t('tugasan_readonly_banner')}
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
                            void toggle(scope, item.key, weekIdx, todayShort(), manager?.id ?? null).then(report)
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
                              {item.noteKind === 'amount' ? t('catatan_rm') : t('catatan')}
                            </Text>
                            <TextInput
                              value={entry.note}
                              onChangeText={(text) => setNote(scope, item.key, weekIdx, text)}
                              onBlur={() => void commitEntry(scope, item.key, weekIdx).then(report)}
                              editable={canFill}
                              placeholder={
                                item.noteKind === 'amount' ? t('contoh_rm') : t('contoh_sales_ok')
                              }
                              placeholderTextColor={C.ink6}
                              className="bg-card border border-line rounded-lg px-2.5 py-2 font-sans text-[12.5px] text-ink-2"
                            />
                          </View>
                          <View>
                            <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mb-1.5">
                              {t('tarikh_pemeriksaan')}
                            </Text>
                            <TextInput
                              value={entry.tarikh}
                              onChangeText={(text) => setTarikh(scope, item.key, weekIdx, text)}
                              onBlur={() => void commitEntry(scope, item.key, weekIdx).then(report)}
                              editable={canFill}
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
        <MonoLabel>{t('pengesahan_mingguan')}</MonoLabel>
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

        <SignOffRow label={t('diisikan_oleh')} scope={scope} render={(so) => nameOf(so.filledBy)} />
        {/* DIPERIKSA OLEH is a stamp, not a typed name: the checker records the
            week under their own number, as a verifier does for a mark. Only a
            week somebody has filled can be checked, and not by that person. */}
        <SignOffRow
          label={t('diperiksa_oleh')}
          scope={scope}
          render={(so) => nameOf(so.checkedBy)}
          action={(so, weekIdx) =>
            canFill && so.filledBy && !so.checkedBy && manager && so.filledBy !== manager.id
              ? () => void stampChecked(scope, weekIdx, manager.id).then(report)
              : undefined
          }
          actionLabel={t('sahkan')}
        />
        <SignOffRow label={t('tarikh')} scope={scope} render={(so) => so.tarikh} />

        <Text className="font-sans text-xs leading-[17px] text-ink-4 mt-3.5 pt-3 border-t border-rule">
          {t('tugasan_signoff_hint')}
        </Text>
      </Card>
      </>
      )}

      <SignOutButton />
    </Screen>
  );
}

function SignOffRow({
  label,
  scope,
  render,
  action,
  actionLabel,
}: {
  label: string;
  scope: string;
  render: (so: WeekSignOff) => string;
  /** A button in place of the value, when this week can be acted on. */
  action?: (so: WeekSignOff, weekIdx: number) => (() => void) | undefined;
  actionLabel?: string;
}) {
  const signOffByMonth = useTugasan((s) => s.signOffByMonth);

  return (
    <View className="flex-row items-center gap-1.5 mt-2">
      <Text className="font-sans-med text-[11.5px] text-ink-3" style={{ width: 96 }}>
        {label}
      </Text>
      {WEEK_COLS.map((_, weekIdx) => {
        const so = tugasanSignOff(signOffByMonth, scope, weekIdx);
        const value = render(so);
        const act = action?.(so, weekIdx);
        if (act) {
          return (
            <Pressable
              key={weekIdx}
              onPress={act}
              accessibilityRole="button"
              className="flex-1 items-center rounded-md py-1"
              style={{ backgroundColor: C.ink }}
            >
              <Text className="font-sans-semi text-[10.5px] text-white">{actionLabel}</Text>
            </Pressable>
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
