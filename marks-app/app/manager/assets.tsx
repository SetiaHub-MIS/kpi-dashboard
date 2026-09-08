import { Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ASSET_INSPECTOR, assetsOfBranch } from '@/data/assets';
import { useBranchLabel } from '@/store/useBranches';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function Assets() {
  const branchLabel = useBranchLabel();
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const branchId = me?.branchId ?? null;
  const rows = assetsOfBranch(branchId);

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">Keadaan aset kedai</Text>
      <Text className="font-sans text-[13.5px] leading-5 text-ink-4 mt-2">
        {branchLabel(branchId)} · diisikan oleh {ASSET_INSPECTOR} · pemeriksaan mingguan
      </Text>

      <View className="gap-2 mt-4">
        {rows.map((a) => (
          <View
            key={a.name}
            className="bg-card rounded-xl px-[15px] py-3.5 border"
            style={{ borderColor: a.open ? C.warnLine : C.line }}
          >
            <View className="flex-row items-center gap-3">
              <View
                className="w-[7px] h-[7px] rounded-full"
                style={{ backgroundColor: a.open ? C.warn : C.pass }}
              />
              <Text className="flex-1 font-sans-med text-[13.5px] leading-[18px] text-ink">
                {a.name}
              </Text>
              <View
                className="px-2 py-[5px] rounded-md"
                style={{ backgroundColor: a.open ? C.warnCard : C.passBg }}
              >
                <Text
                  className="font-mono-semi text-[9.5px]"
                  style={{ color: a.open ? C.warnInk : C.pass }}
                >
                  {a.open ? 'BELUM SELESAI' : 'OK'}
                </Text>
              </View>
            </View>

            {a.open && a.note && (
              <View className="mt-3 pt-3 border-t border-rule">
                <Text className="font-sans text-[12.5px] leading-[19px] text-ink-3">
                  {a.note}
                </Text>
                <Text className="font-mono text-[11px] text-ink-6 mt-2.5">{a.age}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </Screen>
  );
}
