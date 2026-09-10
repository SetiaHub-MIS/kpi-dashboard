import { Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { ReturnRow } from '@/components/ReturnRow';
import { Screen } from '@/components/Screen';
import { gapDays, turnaroundDays } from '@/data/returns';
import { dispositionLabel } from '@/i18n/labels';
import { clearedReturns, returnsVisibleTo, useReturns } from '@/store/useReturns';
import { useLocale, useT } from '@/store/useLocale';
import { currentUser, useSession } from '@/store/useSession';
import { useUsers } from '@/store/useUsers';
import { C } from '@/theme/scoring';

export default function PulanganSelesai() {
  const users = useUsers((s) => s.users);
  const me = currentUser(users, useSession((s) => s.currentUserId));
  const records = useReturns((s) => s.records);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const done = clearedReturns(returnsVisibleTo(records, me));
  const avg = done.length
    ? Math.round(done.reduce((n, r) => n + turnaroundDays(r), 0) / done.length)
    : 0;

  const supplierRoute = done.filter((r) => r.disposition === 'supplier');
  const discardRoute = done.filter((r) => r.disposition === 'discard');

  return (
    <Screen>
      <Text className="font-sans-semi text-[22px] text-ink">{t('tab_selesai')}</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {t('selesai_intro')}
      </Text>

      <Card className="p-[15px] mt-4">
        <MonoLabel>{t('purata_terima_clear')}</MonoLabel>
        <View className="flex-row items-baseline gap-1.5 mt-2.5">
          <Text
            className="font-mono-semi text-[34px]"
            style={{ color: avg > 7 ? C.fail : avg > 3 ? C.warn : C.pass }}
          >
            {avg}
          </Text>
          <Text className="font-mono text-[15px] text-ink-6">{t('hari_bil_count', { count: done.length })}</Text>
        </View>

        <View className="flex-row gap-4 mt-3.5 pt-3 border-t border-rule">
          <RouteStat
            label={dispositionLabel('supplier', locale)}
            count={supplierRoute.length}
            days={avgOf(supplierRoute.map((r) => turnaroundDays(r)))}
          />
          <RouteStat
            label={dispositionLabel('discard', locale)}
            count={discardRoute.length}
            days={avgOf(discardRoute.map((r) => turnaroundDays(r)))}
          />
        </View>

        {supplierRoute.length > 0 && (
          <Text className="font-sans text-[11.5px] leading-[17px] text-ink-4 mt-3">
            {t('pungutan_pembekal_avg', {
              days: avgOf(
                supplierRoute
                  .map((r) => gapDays(r, 'supplier_called', 'picked_up'))
                  .filter((n): n is number => n != null)
              ),
            })}
          </Text>
        )}
      </Card>

      <View className="gap-2 mt-2.5">
        {done.length === 0 ? (
          <Card className="p-4 items-center">
            <Text className="font-sans-med text-[12.5px] text-ink-4">
              {t('belum_ada_bil_selesai')}
            </Text>
          </Card>
        ) : (
          done.map((r) => <ReturnRow key={r.id} record={r} />)
        )}
      </View>
    </Screen>
  );
}

const avgOf = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

function RouteStat({ label, count, days }: { label: string; count: number; days: number }) {
  const t = useT();
  return (
    <View className="flex-1">
      <View className="flex-row items-baseline gap-1">
        <Text className="font-mono-semi text-[17px] text-ink">{days}</Text>
        <Text className="font-mono text-[11px] text-ink-6">{t('hari')}</Text>
      </View>
      <Text className="font-sans text-[11px] leading-[15px] text-ink-4 mt-1">
        {label} · {count}
      </Text>
    </View>
  );
}
