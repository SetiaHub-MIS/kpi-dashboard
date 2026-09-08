import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVE_WEEK } from '@/data/checklist';
import { formKeyForRole, useMarks, weekMark } from '@/store/useMarks';
import { currentUser, useSession } from '@/store/useSession';
import { findUser, staffOfBranch, useUsers } from '@/store/useUsers';
import { pctBg, pctColor } from '@/theme/scoring';

export default function Done() {
  const { id, pct, total, max } = useLocalSearchParams<{
    id: string;
    pct: string;
    total: string;
    max: string;
  }>();
  const insets = useSafeAreaInsets();
  const users = useUsers((s) => s.users);
  const person = findUser(users, id);
  const passThreshold = useMarks((s) => s.passThreshold);
  const submitted = useMarks((s) => s.submitted);
  const startMarking = useMarks((s) => s.startMarking);

  const score = Number(pct) || 0;
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const pending = staffOfBranch(users, me?.branchId ?? null).filter(
    (p) => weekMark(p, ACTIVE_WEEK, submitted) == null
  );

  const next = () => {
    const target = pending[0];
    if (!target) {
      router.replace('/supervisor');
      return;
    }
    startMarking(target.id, formKeyForRole(target.role));
    router.replace(`/mark/${target.id}`);
  };

  return (
    <View
      className="flex-1 bg-app items-center px-6"
      style={{ paddingTop: insets.top + 90, paddingBottom: insets.bottom + 24 }}
    >
      <View
        className="w-[118px] h-[118px] rounded-full items-center justify-center"
        style={{ backgroundColor: pctBg(score, passThreshold) }}
      >
        <Text
          className="font-mono-semi text-[30px]"
          style={{ color: pctColor(score, passThreshold) }}
        >
          {score}%
        </Text>
      </View>

      <Text className="font-sans-semi text-xl text-ink mt-6">Markah dihantar</Text>
      <Text className="font-sans text-sm leading-[22px] text-ink-4 mt-2.5 text-center">
        {person?.name ?? id} · {total}/{max} · Minggu {ACTIVE_WEEK + 1}. Menunggu pengesahan
        MANAGER.
      </Text>

      <Pressable
        onPress={next}
        accessibilityRole="button"
        className="mt-7 px-6 py-3.5 rounded-xl bg-ink active:opacity-80"
      >
        <Text className="font-sans-semi text-sm text-white">
          {pending.length > 0
            ? `Pekerja seterusnya (${pending.length})`
            : 'Semua pekerja selesai'}
        </Text>
      </Pressable>
    </View>
  );
}
