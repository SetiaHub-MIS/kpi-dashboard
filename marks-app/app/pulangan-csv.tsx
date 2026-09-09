import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { submissionStats, toCsv } from '@/data/returns';
import { useBranchLabel } from '@/store/useBranches';
import { returnsVisibleTo, useReturns } from '@/store/useReturns';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function PulanganCsv() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = me?.branchId ?? null;
  const branchLabel = useBranchLabel();
  const records = useReturns((s) => s.records);
  const [copied, setCopied] = useState(false);

  const rows = returnsVisibleTo(records, me);
  const csv = toCsv(rows);
  const stats = submissionStats(rows);

  const copy = async () => {
    await Clipboard.setStringAsync(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen>
      <BackLink label="Pulangan" />
      <Text className="font-sans-semi text-[22px] text-ink mt-4">Export CSV</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        Sistem stok tiada API, jadi senarai ini keluar sebagai CSV. Untuk
        padanan automatik, guna Banding sistem stok — tampal export mereka dan
        app akan tunjuk bil yang ada di satu sistem sahaja.
      </Text>

      <Card className="p-[15px] mt-4">
        <MonoLabel>{branchLabel(branchId)}</MonoLabel>
        <View className="flex-row gap-5 mt-3">
          <Figure value={rows.length} label="baris" />
          <Figure value={stats.onTime} label="ikut masa" tone={C.pass} />
          <Figure value={stats.late} label="lewat" tone={stats.late ? C.warn : undefined} />
          <Figure value={stats.missing} label="tak hantar" tone={stats.missing ? C.fail : undefined} />
        </View>
      </Card>

      <Pressable
        onPress={copy}
        accessibilityRole="button"
        className="mt-2.5 py-3.5 rounded-xl items-center active:opacity-80"
        style={{ backgroundColor: copied ? C.pass : C.ink }}
      >
        <Text className="font-sans-semi text-sm text-white">
          {copied ? 'Disalin' : 'Salin CSV'}
        </Text>
      </Pressable>

      <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-5 mb-2">
        Pratonton
      </Text>
      <View className="bg-card border border-line rounded-[10px] p-3">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <Text selectable className="font-mono text-[10.5px] leading-[17px] text-ink-3">
            {csv}
          </Text>
        </ScrollView>
      </View>
    </Screen>
  );
}

function Figure({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <View>
      <Text className="font-mono-semi text-[19px]" style={{ color: tone ?? C.ink }}>
        {value}
      </Text>
      <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5 mt-1">
        {label}
      </Text>
    </View>
  );
}
