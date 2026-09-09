import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import {
  REASON_LABEL,
  ReturnReason,
  TODAY_ISO,
  newReturnBlocker,
} from '@/data/returns';
import { useBranchLabel } from '@/store/useBranches';
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

  // Prefilled when arriving from the stock-system comparison; blank otherwise.
  // Nothing is saved until the form is submitted, so the figures are still confirmed by a person.
  const prefill = useLocalSearchParams<{
    billNo?: string;
    billDate?: string;
    supplier?: string;
    reason?: string;
  }>();
  const fromRecon = !!prefill.billNo;

  const [billNo, setBillNo] = useState(prefill.billNo ?? '');
  const [billDate, setBillDate] = useState(prefill.billDate || TODAY_ISO);
  const [reason, setReason] = useState<ReturnReason>(
    prefill.reason === 'expired' ? 'expired' : 'damage'
  );
  const [supplier, setSupplier] = useState(prefill.supplier ?? '');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const blocked = newReturnBlocker(records, billNo, billDate);
    if (blocked) {
      setError(blocked);
      return;
    }
    const id = addReturn({
      branchId: me?.branchId ?? 'MCG',
      outlet: branchLabel(me?.branchId),
      billNo,
      billDate,
      reason,
      remark,
      supplier,
      receivedOn: TODAY_ISO,
    });
    router.replace(`/bil/${id}`);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <BackLink label="Pulangan" />
        <Text className="font-sans-semi text-[22px] text-ink mt-4">Bil pulangan baharu</Text>
        <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
          Tarikh terima direkod sebagai hari ini — dari sini masa terima → clear mula dikira.
        </Text>
        {fromRecon && (
          <Text className="font-sans text-[12.5px] leading-[19px] mt-2" style={{ color: C.warn }}>
            Butiran diisi dari export sistem stok
            {prefill.reason ? '' : ', kecuali sebab — jenis bil itu bukan rosak atau luput, jadi pilih sendiri'}
            . Semak sebelum rekod.
          </Text>
        )}

        <Card className="p-[15px] mt-4">
          <MonoLabel>No. bil</MonoLabel>
          <TextInput
            value={billNo}
            onChangeText={(t) => {
              setBillNo(t);
              setError(null);
            }}
            placeholder="cth: BR-8951"
            placeholderTextColor={C.ink6}
            autoCapitalize="characters"
            autoCorrect={false}
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-mono text-[13px] text-ink"
          />
          <View className="mt-3">
            <MonoLabel>Tarikh bil</MonoLabel>
            <TextInput
              value={billDate}
              onChangeText={(t) => {
                setBillDate(t);
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
          <MonoLabel>Catatan bil</MonoLabel>
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
                    {REASON_LABEL[r]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={remark}
            onChangeText={setRemark}
            placeholder="Butiran barang, kuantiti…"
            placeholderTextColor={C.ink6}
            multiline
            className="bg-app border border-[#EAEAE7] rounded-[10px] px-3 py-2.5 mt-2.5 font-sans text-[13px] text-ink-2"
            style={{ minHeight: 56, textAlignVertical: 'top' }}
          />
        </Card>

        <Card className="p-[15px] mt-2.5">
          <MonoLabel>Pembekal</MonoLabel>
          <TextInput
            value={supplier}
            onChangeText={setSupplier}
            placeholder="cth: Gardenia Bakeries"
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
          <Text className="font-sans-semi text-sm text-white">Rekod terima</Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
