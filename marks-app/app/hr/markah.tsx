import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { MONTHS, WEEK_COLS } from '@/data/checklist';
import { cohortStat } from '@/data/hq';
import { ROLE_LABEL } from '@/data/users';
import { useBranches } from '@/store/useBranches';
import { useMarks, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { staffOf, useUsers } from '@/store/useUsers';
import { C, pctColor } from '@/theme/scoring';

/**
 * Individual marking sheets, every outlet, read-only. This is the one place a
 * head-office role sees a person's weekly marks by name — HR needs it, the
 * general manager and manager deliberately do not, which is why it lives under
 * /hr rather than on the shared report.
 *
 * Nothing here writes. Marking stays with the SV/AS who does the checklist and
 * the Area Manager who verifies it.
 */
export default function HrMarkah() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branches = useBranches((s) => s.branches);
  const submitted = useMarks((s) => s.submitted);
  const passThreshold = useMarks((s) => s.passThreshold);

  const markOf = (u: (typeof users)[number], i: number) => weekMark(u, i, submitted);
  const everyone = staffOf(users);

  const outlets = branches
    .filter((b) => b.active)
    .map((b) => {
      const here = everyone.filter((u) => u.branchId === b.id);
      return {
        branch: b,
        kedai: here.filter((u) => u.role === 'staff'),
        stor: here.filter((u) => u.role === 'store'),
      };
    })
    .filter((o) => o.kedai.length + o.stor.length > 0);

  const storAll = everyone.filter((u) => u.role === 'store');
  const storStat = cohortStat(storAll, markOf);

  return (
    <Screen>
      <MonoLabel>
        {me?.name ?? '—'} · {me ? ROLE_LABEL[me.role] : ''} · Semua cawangan
      </MonoLabel>
      <Text className="font-sans-semi text-2xl text-ink mt-2">Markah pekerja</Text>
      <Text className="font-sans text-[13px] leading-5 text-ink-4 mt-1.5">
        {MONTHS[MONTHS.length - 1]} · paparan sahaja, penilaian dibuat oleh SV/AS.
      </Text>

      {/* The stor cohort gets its own headline: it is the KPI HR is asked for,
          and it is easy to lose among the much larger kedai roll. */}
      <Card className="p-[15px] mt-4">
        <MonoLabel>KPI pekerja stor · semua cawangan</MonoLabel>
        <View className="flex-row items-baseline gap-1 mt-2.5">
          <Text
            className="font-mono-semi text-[30px]"
            style={{ color: storStat.marked ? pctColor(storStat.avg, passThreshold) : C.ink6 }}
          >
            {storStat.marked ? storStat.avg : '—'}
          </Text>
          {storStat.marked > 0 && <Text className="font-mono text-[14px] text-ink-6">%</Text>}
        </View>
        <Text className="font-sans text-[12px] leading-[18px] text-ink-4 mt-[7px]">
          {storStat.marked} penilaian daripada {storStat.cellTotal} minggu × pekerja ·{' '}
          {storStat.gaps} belum dinilai
        </Text>
      </Card>

      {outlets.map((o) => (
        <Card key={o.branch.id} className="p-[15px] mt-2.5">
          <View className="flex-row items-baseline justify-between mb-3">
            <Text className="font-sans-semi text-[14px] text-ink">{o.branch.name}</Text>
            <Text className="font-mono-med text-[10px] uppercase tracking-label text-ink-5">
              {o.kedai.length + o.stor.length} pekerja
            </Text>
          </View>

          <View className="flex-row gap-1 mb-1.5" style={{ paddingLeft: 100 }}>
            {WEEK_COLS.map((w) => (
              <Text key={w} className="flex-1 text-center font-mono-med text-[10px] text-ink-5">
                {w}
              </Text>
            ))}
          </View>

          {[
            { key: 'kedai', label: 'Pekerja Kedai', people: o.kedai },
            { key: 'stor', label: 'Pekerja Stor', people: o.stor },
          ]
            .filter((c) => c.people.length > 0)
            .map((cohort) => (
              <View key={cohort.key} className="gap-1">
                <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-6 mt-1.5 mb-0.5">
                  {cohort.label}
                </Text>
                {cohort.people.map((p) => (
                  <View key={p.id} className="flex-row gap-1 items-center">
                    <Pressable
                      onPress={() => router.push(`/person/${p.id}`)}
                      style={{ width: 100 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Rekod ${p.name}`}
                    >
                      <Text className="font-sans-med text-[11.5px] text-ink-2" numberOfLines={1}>
                        {p.short}
                      </Text>
                    </Pressable>
                    {WEEK_COLS.map((_, i) => {
                      const v = markOf(p, i);
                      return (
                        <View
                          key={i}
                          className="flex-1 rounded-md py-1.5 items-center"
                          style={{ backgroundColor: v == null ? C.rule : C.app }}
                        >
                          <Text
                            className="font-mono-semi text-[11.5px]"
                            style={{ color: v == null ? C.ink7 : pctColor(v, passThreshold) }}
                          >
                            {v == null ? '–' : v}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
        </Card>
      ))}
    </Screen>
  );
}
