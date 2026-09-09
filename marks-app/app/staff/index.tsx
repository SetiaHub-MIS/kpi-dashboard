import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { todayLongLabel } from '@/data/period';
import { formForRole } from '@/store/useMarks';
import { useBranchLabel } from '@/store/useBranches';
import { useMarks } from '@/store/useMarks';
import { sparkOf, useMyWeeks } from '@/store/useMyWeeks';
import { currentUser, useSession } from '@/store/useSession';
import { findUser, useUsers } from '@/store/useUsers';
import { C, pctBg, pctColor } from '@/theme/scoring';

/**
 * What a pekerja sees of their own marking. Their own record, read under their
 * own session — not a fixture, and not anyone else's.
 */
export default function StaffHome() {
  const passThreshold = useMarks((s) => s.passThreshold);
  const scaleMax = useMarks((s) => s.scaleMax);
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchLabel = useBranchLabel();

  const weeks = useMyWeeks((s) => s.weeks);
  const load = useMyWeeks((s) => s.load);

  useEffect(() => {
    if (me) void load(me.id, scaleMax);
  }, [me, scaleMax, load]);

  const latest = weeks[0];
  const previous = weeks[1];
  const delta = latest && previous ? latest.pct - previous.pct : null;
  const spark = sparkOf(weeks);

  // The weakest kategori, named — the one line most likely to change behaviour.
  // Naming it matters: "Kebersihan Kedai" tells someone what to do on Monday,
  // where "Perkara 7" tells them to go and look it up.
  const weakest = latest?.perkara.length
    ? latest.perkara.reduce(
        (low, v, i) => (v > 0 && v < low.v ? { v, i } : low),
        { v: 101, i: -1 }
      )
    : null;
  const weakestName =
    weakest && weakest.i >= 0 && me
      ? (formForRole(me.role)[weakest.i]?.name ?? `Perkara ${weakest.i + 1}`)
      : '';

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[12.5px] text-ink-5">{todayLongLabel()}</Text>
          <Text className="font-sans-semi text-xl text-ink mt-1.5">{me?.name ?? '—'}</Text>
          <Text className="font-mono text-[11px] text-ink-5 mt-1.5">
            {me?.id} · {branchLabel(me?.branchId)}
          </Text>
        </View>
        <Avatar init={me?.init ?? '?'} size={40} />
      </View>

      {latest ? (
        <View className="bg-ink rounded-2xl p-5 mt-4">
          <Text className="font-mono-med text-[10px] uppercase tracking-label text-[#8E9089]">
            {latest.label}
          </Text>
          <View className="flex-row items-baseline gap-1.5 mt-3">
            <Text className="font-mono-semi text-[44px] text-white">{latest.pct}</Text>
            <Text className="font-mono text-base text-[#75776F]">
              % · {latest.total}/{latest.maxScore}
            </Text>
            {delta != null && delta !== 0 && (
              <Text
                className="font-mono-med text-xs ml-auto"
                style={{ color: delta > 0 ? '#7FCB9E' : '#E0907C' }}
              >
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
              </Text>
            )}
          </View>

          {spark.length > 1 && (
            <View className="flex-row gap-1 items-end h-9 mt-[18px]">
              {spark.map((v, i) => (
                <View
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    // Floored so a very low week is still a visible bar rather
                    // than nothing at all.
                    height: Math.max(6, Math.round(((v - 60) / 40) * 28) + 6),
                    backgroundColor: i === spark.length - 1 ? '#fff' : '#4A4C4E',
                  }}
                />
              ))}
            </View>
          )}

          {weakest && weakest.i >= 0 && (
            <Text className="font-sans text-[11.5px] leading-[17px] text-[#A8AAA3] mt-3.5 pt-3 border-t border-[#2B2C2E]">
              {weakestName} paling rendah ({weakest.v}%) minggu ini.
              {latest.note ? ` ${latest.note}` : ''}
            </Text>
          )}
        </View>
      ) : (
        <Card className="p-4 mt-4">
          <Text className="font-sans-med text-[13px] text-ink-3">
            Belum ada markah direkod untuk anda.
          </Text>
          <Text className="font-sans text-[12.5px] leading-[19px] text-ink-5 mt-1.5">
            SV/AS akan menilai checklist mingguan anda. Markah akan muncul di sini
            sebaik ia dihantar.
          </Text>
        </Card>
      )}

      {weeks.length > 0 && (
        <>
          <Text className="font-sans-semi text-[13.5px] text-ink mt-5 mb-2.5 px-0.5">
            Markah mingguan
          </Text>

          <View className="gap-2">
            {weeks.map((w, i) => {
              const scorer = w.scoredBy ? findUser(users, w.scoredBy) : undefined;
              return (
                <Pressable
                  key={w.markId}
                  onPress={() => router.push(`/week/${i}`)}
                  accessibilityRole="button"
                  className="bg-card border border-line rounded-xl px-3.5 py-3 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="px-2.5 py-[9px] rounded-[9px]"
                      style={{ backgroundColor: pctBg(w.pct, passThreshold) }}
                    >
                      <Text
                        className="font-mono-semi text-[15px]"
                        style={{ color: pctColor(w.pct, passThreshold) }}
                      >
                        {w.pct}%
                      </Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="font-sans-semi text-[13.5px] text-ink">{w.label}</Text>
                      <Text className="font-sans text-[11.5px] text-ink-5 mt-1">
                        {w.total}/{w.maxScore}
                        {scorer ? ` · ${scorer.short}` : ''}
                      </Text>
                    </View>
                    {!w.verified && (
                      <View
                        className="w-[7px] h-[7px] rounded-full"
                        style={{ backgroundColor: C.link }}
                        accessibilityLabel="Belum disahkan MANAGER"
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}
