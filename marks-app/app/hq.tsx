import { Text } from 'react-native';
import { BackLink } from '@/components/BackLink';
import { Card } from '@/components/Card';
import { OutletReportView } from '@/components/OutletReportView';
import { Screen } from '@/components/Screen';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { SignOutButton } from '@/components/SignOutButton';

/**
 * The head-office view for the manager and general manager. HR gets the same
 * report as the first tab of /hr, alongside the drill-downs those two do not
 * need.
 */
export default function HeadOffice() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));

  return (
    <Screen>
      <BackLink label="Log masuk" />
      {me ? (
        <>
          <OutletReportView me={me} />
          <SignOutButton />
        </>
      ) : (
        <Card className="p-4 mt-4">
          <Text className="font-sans-med text-[13px] text-ink-3">
            Log masuk sebagai Manager atau General Manager untuk melihat laporan
            cawangan.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
