import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { QueryThread } from '@/components/QueryThread';
import { Screen } from '@/components/Screen';
import { useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { findUser, useUsers } from '@/store/useUsers';

export default function QueryScreen() {
  const { markId, label, otherName } = useLocalSearchParams<{
    markId: string;
    label?: string;
    otherName?: string;
  }>();
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const nameOf = (userId: string) => findUser(users, userId)?.name ?? userId;
  const t = useT();

  return (
    <Screen>
      <BackLink label={t('kembali')} />
      <Text className="font-sans-semi text-[19px] text-ink mt-4">
        {label ?? t('soalan_markah_fallback')}
      </Text>
      {otherName && (
        <Text className="font-sans text-[12.5px] text-ink-5 mt-1.5">{t('dengan_nama', { name: otherName })}</Text>
      )}
      <QueryThread markId={Number(markId)} me={me} nameOf={nameOf} />
    </Screen>
  );
}
