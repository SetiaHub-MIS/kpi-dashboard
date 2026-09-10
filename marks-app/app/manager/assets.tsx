import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { daysBetweenIso, todayIso } from '@/data/period';
import { reportAssetIssue, resolveAssetIssue } from '@/lib/assets';
import { useBranchLabel } from '@/store/useBranches';
import { assetsOfBranch, useAssets } from '@/store/useAssets';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function Assets() {
  const branchLabel = useBranchLabel();
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = me?.branchId ?? null;
  const rows = useAssets((s) => s.rows);
  const setRow = useAssets((s) => s.setRow);
  const items = assetsOfBranch(rows, branchId);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);

  const startReport = (id: number) => {
    setEditingId(id);
    setDraftNote('');
  };

  const submitReport = async (id: number) => {
    if (!draftNote.trim() || saving) return;
    setSaving(true);
    try {
      setRow(await reportAssetIssue(id, draftNote));
      setEditingId(null);
    } catch {
      // Left on screen in the editor; the person can try again.
    } finally {
      setSaving(false);
    }
  };

  const resolve = async (id: number) => {
    if (saving) return;
    setSaving(true);
    try {
      setRow(await resolveAssetIssue(id));
    } catch {
      // Stays open on screen; retry is just tapping again.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Keadaan aset kedai</Text>
      <Text className="font-sans text-[13.5px] leading-5 text-ink-4 mt-2">
        {branchLabel(branchId)} · dikemaskini oleh {me?.name ?? 'Area Manager'} · pemeriksaan
        mingguan
      </Text>

      <View className="gap-2 mt-4">
        {items.map((a) => {
          const isEditing = editingId === a.id;
          const age = a.isOpen && a.openedOn ? daysBetweenIso(a.openedOn, todayIso()) : null;

          return (
            <View
              key={a.id}
              className="bg-card rounded-xl px-[15px] py-3.5 border"
              style={{ borderColor: a.isOpen ? C.warnLine : C.line }}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: a.isOpen ? C.warn : C.pass }}
                />
                <Text className="flex-1 font-sans-med text-[13.5px] leading-[18px] text-ink">
                  {a.name}
                </Text>
                <View
                  className="px-2 py-[5px] rounded-md"
                  style={{ backgroundColor: a.isOpen ? C.warnCard : C.passBg }}
                >
                  <Text
                    className="font-mono-semi text-[9.5px]"
                    style={{ color: a.isOpen ? C.warnInk : C.pass }}
                  >
                    {a.isOpen ? 'BELUM SELESAI' : 'OK'}
                  </Text>
                </View>
              </View>

              {a.isOpen && a.note && (
                <View className="mt-3 pt-3 border-t border-rule">
                  <Text className="font-sans text-[12.5px] leading-[19px] text-ink-3">
                    {a.note}
                  </Text>
                  {age != null && (
                    <Text className="font-mono text-[11px] text-ink-6 mt-2.5">
                      {age} hari terbuka
                    </Text>
                  )}
                </View>
              )}

              {a.isOpen && !isEditing && (
                <Pressable
                  onPress={() => void resolve(a.id)}
                  accessibilityRole="button"
                  className="mt-3 py-2.5 rounded-[9px] bg-ink items-center active:opacity-80"
                >
                  <Text className="font-sans-semi text-[12.5px] text-white">
                    Tanda selesai
                  </Text>
                </Pressable>
              )}

              {!a.isOpen && !isEditing && (
                <Pressable
                  onPress={() => startReport(a.id)}
                  accessibilityRole="button"
                  className="mt-3 py-2.5 rounded-[9px] border border-line items-center active:opacity-70"
                >
                  <Text className="font-sans-semi text-[12.5px] text-ink-2">
                    Laporkan isu
                  </Text>
                </Pressable>
              )}

              {isEditing && (
                <View className="mt-3 pt-3 border-t border-rule">
                  <TextInput
                    value={draftNote}
                    onChangeText={setDraftNote}
                    placeholder="Terangkan isu ini…"
                    placeholderTextColor={C.ink7}
                    multiline
                    className="font-sans text-[12.5px] text-ink border border-line rounded-[9px] px-3 py-2.5 min-h-[64px]"
                  />
                  <View className="flex-row gap-2 mt-2.5">
                    <Pressable
                      onPress={() => void submitReport(a.id)}
                      accessibilityRole="button"
                      className="flex-1 py-2.5 rounded-[9px] bg-ink items-center active:opacity-80"
                      style={{ opacity: draftNote.trim() ? 1 : 0.5 }}
                    >
                      <Text className="font-sans-semi text-[12.5px] text-white">Hantar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setEditingId(null)}
                      accessibilityRole="button"
                      className="py-2.5 px-3 rounded-[9px] border border-line items-center active:opacity-70"
                    >
                      <Text className="font-sans-semi text-[12.5px] text-ink-2">Batal</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
