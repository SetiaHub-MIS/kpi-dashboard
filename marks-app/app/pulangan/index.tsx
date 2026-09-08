import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { ReturnRow } from '@/components/ReturnRow';
import { Screen } from '@/components/Screen';
import { ROLE_LABEL } from '@/data/users';
import { STAGE_OWNER, nextStage, ownerForRole, turnaroundDays } from '@/data/returns';
import { useBranchLabel } from '@/store/useBranches';
import { currentUser, useSession } from '@/store/useSession';
import { openReturns, returnsOfBranch, useReturns } from '@/store/useReturns';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function PulanganAktif() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = me?.branchId ?? null;
  const branchLabel = useBranchLabel();
  const records = useReturns((s) => s.records);

  // Only the two store roles can advance a return; others read it.
  const myOwner = ownerForRole(me?.role);
  const open = openReturns(returnsOfBranch(records, branchId));

  const mine = open.filter((r) => {
    const stage = nextStage(r);
    return stage != null && STAGE_OWNER[stage] === myOwner;
  });
  const others = open.filter((r) => !mine.includes(r));
  const oldest = open.reduce((n, r) => Math.max(n, turnaroundDays(r)), 0);

  return (
    <Screen>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <MonoLabel>
            {me?.name ?? '—'} · {me ? ROLE_LABEL[me.role] : ''} · {branchLabel(branchId)}
          </MonoLabel>
          <Text className="font-sans-semi text-2xl text-ink mt-2">Pulangan</Text>
        </View>
        {myOwner === 'store' && (
          <Pressable
            onPress={() => router.push('/pulangan-new')}
            accessibilityRole="button"
            accessibilityLabel="Rekod bil pulangan"
            className="px-3.5 py-2.5 rounded-xl bg-ink active:opacity-80"
          >
            <Text className="font-sans-semi text-[13px] text-white">+ Bil</Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row gap-2.5 mt-4">
        <Card className="flex-1 p-[15px]">
          <MonoLabel>Belum selesai</MonoLabel>
          <Text className="font-mono-semi text-[34px] text-ink mt-2.5">{open.length}</Text>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">bil pulangan</Text>
        </Card>
        <Card className="flex-1 p-[15px]">
          <MonoLabel>Paling lama</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[34px]"
              style={{ color: oldest > 7 ? C.fail : oldest > 3 ? C.warn : C.ink }}
            >
              {oldest}
            </Text>
            <Text className="font-mono text-[13px] text-ink-6">hari</Text>
          </View>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">terima → belum clear</Text>
        </Card>
      </View>

      <Text className="font-sans-semi text-[13.5px] text-ink mt-5 mb-2.5">
        Tindakan anda · {mine.length}
      </Text>
      {mine.length === 0 ? (
        <Card className="p-4 items-center">
          <Text className="font-sans-med text-[12.5px] text-ink-4">
            Tiada bil menunggu tindakan anda.
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          {mine.map((r) => (
            <ReturnRow key={r.id} record={r} mine={myOwner} />
          ))}
        </View>
      )}

      {others.length > 0 && (
        <>
          <Text className="font-sans-semi text-[13.5px] text-ink mt-5 mb-2.5">
            Menunggu pihak lain · {others.length}
          </Text>
          <View className="gap-2">
            {others.map((r) => (
              <ReturnRow key={r.id} record={r} mine={myOwner} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
