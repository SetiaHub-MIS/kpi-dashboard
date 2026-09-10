import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import {
  ReturnReason,
  TODAY_ISO,
  newReturnBlocker,
} from '@/data/returns';
import { isHq } from '@/data/branches';
import { reasonLabel } from '@/i18n/labels';
import { useActiveBranches, useBranchLabel } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { useReturns } from '@/store/useReturns';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function NewReturn() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchLabel = useBranchLabel();
  const records = useReturns((s) => s.records);
  const addReturn = useReturns((s) => s.addReturn);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  // Prefilled when arriving from the stock-system comparison; blank otherwise.
  // Nothing is saved until the form is submitted, so the figures are still confirmed by a person.
  const prefill = useLocalSearchParams<{
    billNo?: string;
    billDate?: string;
    supplier?: string;
    reason?: string;
    outlet?: string;
  }>();
  const fromRecon = !!prefill.billNo;

  // The stor team sits at HQ, so the outlet the goods came from has to be
  // chosen — it is no longer implied by who is signed in. The stock system's
  // location code is the same code, so a bill arriving from the comparison
  // screen already knows its outlet.
  const outlets = useActiveBranches().filter((b) => !isHq(b.id));
  const [outletId, setOutletId] = useState<string | null>(
    outlets.some((b) => b.id === prefill.outlet) ? (prefill.outlet as string) : null
  );
  const [outletFilter, setOutletFilter] = useState('');
  const shownOutlets = outlets.filter((b) =>
    `${b.id} ${b.name}`.toLowerCase().includes(outletFilter.trim().toLowerCase())
  );

  const [billNo, setBillNo] = useState(prefill.billNo ?? '');
  const [billDate, setBillDate] = useState(prefill.billDate || TODAY_ISO);
  const [reason, setReason] = useState<ReturnReason>(
    prefill.reason === 'expired' ? 'expired' : 'damage'
  );
  const [supplier, setSupplier] = useState(prefill.supplier ?? '');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!outletId) {
      setError(t('pilih_cawangan_hantar'));
      return;
    }
    const blocked = newReturnBlocker(records, billNo, billDate);
    if (blocked) {
      setError(blocked);
      return;
    }
    const id = addReturn({
      branchId: outletId,
      outlet: branchLabel(outletId),
      billNo,
      billDate,
      reason,
      remark,
      supplier,
      receivedOn: TODAY_ISO,
      by: me?.id,
    });
    router.replace(`/bil/${id}`);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <BackLink label={t('tab_pulangan')} />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">{t('bil_pulangan_baharu')}</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          {t('pulangan_new_intro')}
        </Text>
        {fromRecon && (
          <Text className="font-sans text-[12.5px] leading-[19px] mt-2" style={{ color: C.warn }}>
            {t('recon_prefill_note', { reasonNote: prefill.reason ? '' : t('recon_reason_note') })}
          </Text>
        )}

        <Card className="p-[15px] mt-4">
          <MonoLabel>{t('cawangan_hantar')}</MonoLabel>
          <TextInput
            value={outletFilter}
            onChangeText={setOutletFilter}
            placeholder={t('cari_cawangan_kod')}
            placeholderTextColor={C.ink6}
            autoCorrect={false}
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13px] text-ink"
          />
          <View className="flex-row flex-wrap gap-1.5 mt-2.5">
            {shownOutlets.slice(0, 24).map((b) => {
              const on = outletId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    setOutletId(b.id);
                    setError(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  className="px-2.5 py-1.5 rounded-lg border"
                  style={{
                    borderColor: on ? 'transparent' : C.line,
                    backgroundColor: on ? C.ink : C.card,
                  }}
                >
                  <Text
                    className="font-mono text-[11px]"
                    style={{ color: on ? '#fff' : C.ink3 }}
                  >
                    {b.id} · {b.short}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {shownOutlets.length > 24 && (
            <Text className="font-sans text-[11.5px] text-ink-5 mt-2">
              {t('n_lagi_taip_tapis', { count: shownOutlets.length - 24 })}
            </Text>
          )}
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('no_bil')}</MonoLabel>
          <TextInput
            value={billNo}
            onChangeText={(text) => {
              setBillNo(text);
              setError(null);
            }}
            placeholder={t('contoh_bill_no')}
            placeholderTextColor={C.ink6}
            autoCapitalize="characters"
            autoCorrect={false}
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-mono text-[13px] text-ink"
          />
          <View className="mt-3">
            <MonoLabel>{t('tarikh_bil')}</MonoLabel>
            <TextInput
              value={billDate}
              onChangeText={(text) => {
                setBillDate(text);
                setError(null);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.ink6}
              autoCorrect={false}
              className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-mono text-[13px] text-ink"
            />
          </View>
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('catatan_bil')}</MonoLabel>
          <View className="flex-row gap-2 mt-2.5">
            {(['damage', 'expired'] as ReturnReason[]).map((r) => {
              const on = reason === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
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
                    {reasonLabel(r, locale)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={remark}
            onChangeText={setRemark}
            placeholder={t('butiran_barang_kuantiti')}
            placeholderTextColor={C.ink6}
            multiline
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13px] text-ink-2"
            style={{ minHeight: 56, textAlignVertical: 'top' }}
          />
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>{t('pembekal')}</MonoLabel>
          <TextInput
            value={supplier}
            onChangeText={setSupplier}
            placeholder={t('contoh_pembekal')}
            placeholderTextColor={C.ink6}
            autoCapitalize="words"
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13.5px] text-ink"
          />
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
          accessibilityRole="button"
          className="mt-3.5 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
        >
          <Text className="font-sans-semi text-sm text-white">{t('rekod_terima')}</Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
