import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { sendReminder } from '@/lib/reminders';
import { monthStats, useMarks, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { primaryOfBranch, useUsers, visibleStaff } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function Gaps() {
  const submitted = useMarks((s) => s.submitted);
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const crew = visibleStaff(users, me);
  const stats = monthStats(crew, submitted);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const rows = crew.map((p) => {
    const missing = p.w
      .map((_, i) => (weekMark(p, i, submitted) == null ? i + 1 : null))
      .filter((n): n is number => n != null);
    return { person: p, missing };
  }).filter((r) => r.missing.length > 0);

  const sendAll = async () => {
    if (!me || sending) return;
    setSending(true);
    setSentCount(null);

    // Grouped by branch, because the recipient is the SV/AS covering that
    // outlet, not the crew member themselves — this is a nudge to whoever
    // still owes the marking, not a broadcast to everyone with a gap.
    const byBranch = new Map<string, { person: (typeof rows)[number]['person']; missing: number[] }[]>();
    rows.forEach((r) => {
      const list = byBranch.get(r.person.branchId ?? '') ?? [];
      list.push(r);
      byBranch.set(r.person.branchId ?? '', list);
    });

    let sent = 0;
    for (const [branchId, group] of byBranch) {
      const supervisor = primaryOfBranch(users, 'supervisor', branchId);
      if (!supervisor) continue;
      const message = group
        .map((r) => `${r.person.short}: minggu ${r.missing.join(', ')}`)
        .join('; ');
      try {
        await sendReminder({
          branchId,
          recipientId: supervisor.id,
          sentBy: me.id,
          message: `${group.length} pekerja belum dinilai — ${message}.`,
        });
        sent += 1;
      } catch {
        // Left uncounted; the button stays available to try again.
      }
    }

    setSentCount(sent);
    setSending(false);
  };

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Belum dinilai</Text>
      <Text className="font-sans text-sm leading-[20px] text-ink-4 mt-2">
        {stats.gaps} daripada {stats.cellTotal} kotak minggu × pekerja masih kosong. Ini
        yang jadi #DIV/0! dalam fail Excel.
      </Text>

      {rows.length === 0 ? (
        <Card className="p-5 mt-[18px] items-center">
          <Text className="font-sans-med text-sm text-ink-3">
            Semua kotak sudah diisi bulan ini.
          </Text>
        </Card>
      ) : (
        <View className="gap-2.5 mt-[18px]">
          {rows.map(({ person, missing }) => (
            <Card key={person.id} className="px-4 py-[15px]">
              <View className="flex-row items-center gap-3">
                <Avatar init={person.init} />
                <View className="flex-1 min-w-0">
                  <Text className="font-sans-semi text-[13.5px] text-ink">
                    {person.name}
                  </Text>
                  <Text className="font-sans text-[11.5px] text-ink-5 mt-1">
                    {person.id} · minggu {missing.join(', ')}
                  </Text>
                </View>
                <Text className="font-mono-semi text-[18px]" style={{ color: C.warn }}>
                  {missing.length}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {rows.length > 0 && (
        <>
          <Pressable
            onPress={() => void sendAll()}
            disabled={sending}
            accessibilityRole="button"
            className="mt-3.5 py-3.5 rounded-xl bg-ink items-center active:opacity-80"
            style={{ opacity: sending ? 0.6 : 1 }}
          >
            <Text className="font-sans-semi text-sm text-white">
              {sending ? 'Menghantar…' : 'Hantar peringatan ke SV/AS'}
            </Text>
          </Pressable>
          {sentCount != null && (
            <Text className="font-sans text-[12.5px] text-ink-4 mt-2.5 text-center">
              {sentCount} SV/AS menerima peringatan dalam apl.
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}
