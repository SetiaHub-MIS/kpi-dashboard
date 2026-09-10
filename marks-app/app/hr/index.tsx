import { Text } from 'react-native';
import { Card } from '@/components/Card';
import { OutletReportView } from '@/components/OutletReportView';
import { Screen } from '@/components/Screen';
import { useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { SignOutButton } from '@/components/SignOutButton';

export default function HrLaporan() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const t = useT();

  return (
    <Screen>
      {me ? (
        <>
          <OutletReportView me={me} />
          <SignOutButton />
        </>
      ) : (
        <Card className="p-4 mt-4">
          <Text className="font-sans-med text-[13px] text-ink-3">
            {t('log_masuk_hr')}
          </Text>
        </Card>
      )}
    </Screen>
  );
}
