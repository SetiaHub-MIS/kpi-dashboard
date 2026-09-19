import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/Card';
import { OutletPicker } from '@/components/OutletPicker';
import { Screen } from '@/components/Screen';
import { isHq } from '@/data/branches';
import { daysBetweenIso, todayIso } from '@/data/period';
import { branchesOf, isCrossBranch } from '@/data/users';
import { AssetRow, reportAssetIssue, resolveAssetIssue } from '@/lib/assets';
import { roleLabel } from '@/i18n/labels';
import { useActiveBranches, useBranchLabel } from '@/store/useBranches';
import { assetsVisibleTo, useAssets } from '@/store/useAssets';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

/**
 * The Checklist Kedai asset log, one outlet at a time. An Area Manager with
 * several outlets picks which from a dropdown (home outlet first); the
 * Manager picks from every outlet. With a single outlet there is nothing to
 * pick and the name is simply shown.
 */
export default function Assets() {
  const branchLabel = useBranchLabel();
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const rows = useAssets((s) => s.rows);
  const setRow = useAssets((s) => s.setRow);
  const allOutlets = useActiveBranches().filter((b) => !isHq(b.id)).map((b) => b.id);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const outlets = me ? (isCrossBranch(me.role) ? allOutlets : branchesOf(me)) : [];
  const branchId = picked && outlets.includes(picked) ? picked : (outlets[0] ?? null);
  const items = assetsVisibleTo(rows, me).filter((a) => a.branchId === branchId);

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
      <Text className="font-sans-semi text-[22px] text-ink">{t('keadaan_aset_kedai')}</Text>
      <Text className="font-sans text-[13.5px] leading-5 text-ink-4 mt-2">
        {t('aset_dikemaskini', {
          branch: branchId ? branchLabel(branchId) : t('semua_cawangan'),
          name: me?.name ?? roleLabel('area_manager', locale),
        })}
      </Text>

      {outlets.length > 1 && branchId && (
        <View className="mt-4">
          <OutletPicker
            outlets={outlets}
            value={branchId}
            onChange={(id) => {
              setPicked(id);
              setEditingId(null);
            }}
          />
        </View>
      )}

      {items.length === 0 && (
        <Card className="p-5 mt-4 items-center">
          <Text className="font-sans-med text-sm text-ink-3 text-center">
            {t('tiada_rekod_aset')}
          </Text>
        </Card>
      )}

      <View className="gap-2 mt-4">
        {items.map((a) => (
          <AssetItem
            key={a.id}
            asset={a}
            editing={editingId === a.id}
            draftNote={draftNote}
            onDraftNote={setDraftNote}
            onStartReport={() => startReport(a.id)}
            onSubmitReport={() => void submitReport(a.id)}
            onCancel={() => setEditingId(null)}
            onResolve={() => void resolve(a.id)}
          />
        ))}
      </View>
    </Screen>
  );
}

function AssetItem({
  asset: a,
  editing,
  draftNote,
  onDraftNote,
  onStartReport,
  onSubmitReport,
  onCancel,
  onResolve,
}: {
  asset: AssetRow;
  editing: boolean;
  draftNote: string;
  onDraftNote: (text: string) => void;
  onStartReport: () => void;
  onSubmitReport: () => void;
  onCancel: () => void;
  onResolve: () => void;
}) {
  const t = useT();
  const age = a.isOpen && a.openedOn ? daysBetweenIso(a.openedOn, todayIso()) : null;

  return (
    <View
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
            {a.isOpen ? t('belum_selesai') : t('ok_status')}
          </Text>
        </View>
      </View>

      {a.isOpen && a.note && (
        <View className="mt-3 pt-3 border-t border-rule">
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-3">{a.note}</Text>
          {age != null && (
            <Text className="font-mono text-[11px] text-ink-6 mt-2.5">
              {t('hari_terbuka', { days: age })}
            </Text>
          )}
        </View>
      )}

      {a.isOpen && !editing && (
        <Pressable
          onPress={onResolve}
          accessibilityRole="button"
          className="mt-3 py-2.5 rounded-[9px] bg-ink items-center active:opacity-80"
        >
          <Text className="font-sans-semi text-[12.5px] text-white">{t('tanda_selesai')}</Text>
        </Pressable>
      )}

      {!a.isOpen && !editing && (
        <Pressable
          onPress={onStartReport}
          accessibilityRole="button"
          className="mt-3 py-2.5 rounded-[9px] border border-line items-center active:opacity-70"
        >
          <Text className="font-sans-semi text-[12.5px] text-ink-2">{t('laporkan_isu')}</Text>
        </Pressable>
      )}

      {editing && (
        <View className="mt-3 pt-3 border-t border-rule">
          <TextInput
            value={draftNote}
            onChangeText={onDraftNote}
            placeholder={t('terangkan_isu')}
            placeholderTextColor={C.ink7}
            multiline
            className="font-sans text-[12.5px] text-ink border border-line rounded-[9px] px-3 py-2.5 min-h-[64px]"
          />
          <View className="flex-row gap-2 mt-2.5">
            <Pressable
              onPress={onSubmitReport}
              accessibilityRole="button"
              className="flex-1 py-2.5 rounded-[9px] bg-ink items-center active:opacity-80"
              style={{ opacity: draftNote.trim() ? 1 : 0.5 }}
            >
              <Text className="font-sans-semi text-[12.5px] text-white">{t('hantar')}</Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              className="py-2.5 px-3 rounded-[9px] border border-line items-center active:opacity-70"
            >
              <Text className="font-sans-semi text-[12.5px] text-ink-2">{t('batal')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
