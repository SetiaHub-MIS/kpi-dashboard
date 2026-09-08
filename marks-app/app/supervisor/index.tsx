import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { MonoLabel } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ACTIVE_WEEK } from '@/data/checklist';
import { useBranchLabel } from '@/store/useBranches';
import { ROLE_LABEL, User } from '@/data/users';
import { formKeyForRole, useMarks, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { staffOfBranch, useUsers } from '@/store/useUsers';
import { pctBg, pctColor } from '@/theme/scoring';

export default function SupervisorQueue() {
  const submitted = useMarks((s) => s.submitted);
  const passThreshold = useMarks((s) => s.passThreshold);
  const startMarking = useMarks((s) => s.startMarking);
  const users = useUsers((s) => s.users);

  const supervisor = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = supervisor?.branchId ?? null;
  const crew = staffOfBranch(users, branchId);
  const branchLabel = useBranchLabel();
  const pending = crew.filter((p) => weekMark(p, ACTIVE_WEEK, submitted) == null);

  const open = (person: User) => {
    startMarking(person.id, formKeyForRole(person.role));
    router.push(`/mark/${person.id}`);
  };

  return (
    <Screen>
      <MonoLabel>
        {supervisor?.name ?? 'Tiada SV/AS'} · {ROLE_LABEL.supervisor} · {branchLabel(branchId)}
      </MonoLabel>
      <Text className="font-sans-semi text-2xl text-ink mt-2">
        Checklist Minggu {ACTIVE_WEEK + 1}
      </Text>
      <Text className="font-sans text-[13.5px] leading-5 text-ink-4 mt-2">
        Tarikh 8–14 Sep. {pending.length} daripada {crew.length} pekerja belum dinilai.
        Tutup sebelum Ahad.
      </Text>

      <View className="gap-2 mt-[18px]">
        {crew.map((p) => {
          const v = weekMark(p, ACTIVE_WEEK, submitted);
          const done = v != null;
          return (
            <Pressable
              key={p.id}
              onPress={() => open(p)}
              accessibilityRole="button"
              className="bg-card border border-line rounded-xl px-3.5 py-3 active:opacity-70"
              style={{ opacity: done ? 0.6 : 1 }}
            >
              <View className="flex-row items-center gap-3">
                <Avatar init={p.init} />
                <View className="flex-1 min-w-0">
                  <Text className="font-sans-semi text-[13.5px] text-ink">{p.name}</Text>
                  <Text className="font-mono text-[11px] text-ink-5 mt-1">
                    {p.id} · {p.role === 'store' ? 'STOR' : 'KEDAI'}
                  </Text>
                </View>
                {done ? (
                  <View
                    className="px-2.5 py-[7px] rounded-lg"
                    style={{ backgroundColor: pctBg(v, passThreshold) }}
                  >
                    <Text
                      className="font-mono-semi text-[12.5px]"
                      style={{ color: pctColor(v, passThreshold) }}
                    >
                      {v}%
                    </Text>
                  </View>
                ) : (
                  <View className="px-[11px] py-[7px] rounded-lg bg-ink">
                    <Text className="font-sans-semi text-xs text-white">Isi</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
