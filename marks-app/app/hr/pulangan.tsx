import { Text, View } from 'react-native';
import { Card, MonoLabel } from '@/components/Card';
import { ReturnRow } from '@/components/ReturnRow';
import { Screen } from '@/components/Screen';
import {
  AGE_BUCKETS,
  bucketOf,
  transitionStats,
  turnaroundDays,
} from '@/data/returns';
import { stageLabel } from '@/i18n/labels';
import { useBranches } from '@/store/useBranches';
import { useLocale, useT } from '@/store/useLocale';
import { clearedReturns, openReturns, useReturns } from '@/store/useReturns';
import { C } from '@/theme/scoring';

const avgOf = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

export default function AdminPulangan() {
  const records = useReturns((s) => s.records);
  const branches = useBranches((s) => s.branches);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const open = openReturns(records);
  const cleared = clearedReturns(records);
  const avgClear = avgOf(cleared.map((r) => turnaroundDays(r)));
  const oldest = open.reduce((n, r) => Math.max(n, turnaroundDays(r)), 0);

  const buckets = AGE_BUCKETS.map((b) => ({
    label: b.label,
    count: open.filter((r) => bucketOf(turnaroundDays(r)) === b.label).length,
  }));
  const worstBucket = buckets.filter((b) => b.count > 0).pop();

  const hops = transitionStats(records).sort((a, b) => b.avg - a.avg);
  const slowest = hops[0];

  const perBranch = branches
    .map((b) => {
      const mine = records.filter((r) => r.branchId === b.id);
      const mineOpen = openReturns(mine);
      const mineCleared = clearedReturns(mine);
      return {
        branch: b,
        open: mineOpen.length,
        avg: avgOf(mineCleared.map((r) => turnaroundDays(r))),
        oldest: mineOpen.reduce((n, r) => Math.max(n, turnaroundDays(r)), 0),
      };
    })
    .filter((row) => row.open > 0 || row.avg > 0);

  const worstOpen = [...open]
    .sort((a, b) => turnaroundDays(b) - turnaroundDays(a))
    .slice(0, 5);

  return (
    <Screen>
      <MonoLabel>{t('semua_cawangan_hr')}</MonoLabel>
      <Text className="font-sans-semi text-2xl text-ink mt-2">{t('umur_pulangan')}</Text>
      <Text className="font-sans text-sm leading-5 text-ink-4 mt-2">
        {t('umur_pulangan_intro')}
      </Text>

      <View className="flex-row gap-2.5 mt-4">
        <Card className="flex-1 p-[15px]">
          <MonoLabel>{t('purata_clear')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[34px]"
              style={{ color: avgClear > 7 ? C.fail : avgClear > 3 ? C.warn : C.pass }}
            >
              {avgClear}
            </Text>
            <Text className="font-mono text-[13px] text-ink-6">{t('hari')}</Text>
          </View>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">{t('n_bil_selesai', { count: cleared.length })}</Text>
        </Card>
        <Card className="flex-1 p-[15px]">
          <MonoLabel>{t('masih_terbuka')}</MonoLabel>
          <View className="flex-row items-baseline gap-1 mt-2.5">
            <Text
              className="font-mono-semi text-[34px]"
              style={{ color: oldest > 7 ? C.fail : oldest > 3 ? C.warn : C.ink }}
            >
              {open.length}
            </Text>
            <Text className="font-mono text-[13px] text-ink-6">{t('bil')}</Text>
          </View>
          <Text className="font-sans text-xs text-ink-4 mt-[7px]">{t('tertua_n_hari', { days: oldest })}</Text>
        </Card>
      </View>

      <Card className="p-[15px] mt-2.5">
        <Text className="font-sans-semi text-[13px] text-ink">{t('umur_bil_terbuka')}</Text>
        <View className="gap-3 mt-3.5">
          {buckets.map((b, i) => {
            const pct = open.length ? Math.round((b.count / open.length) * 100) : 0;
            const color = i === 0 ? C.pass : i === 1 ? C.ink : i === 2 ? C.warn : C.fail;
            return (
              <View key={b.label}>
                <View className="flex-row justify-between items-baseline">
                  <Text className="font-sans-med text-[12.5px] text-ink-2">{b.label}</Text>
                  <Text className="font-mono-semi text-[12.5px]" style={{ color }}>
                    {b.count}
                  </Text>
                </View>
                <View className="h-[5px] rounded-[3px] bg-rule mt-[7px] overflow-hidden">
                  <View
                    className="h-full rounded-[3px]"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </View>
              </View>
            );
          })}
        </View>
        {worstBucket && worstBucket.label !== AGE_BUCKETS[0].label && (
          <Text className="font-sans text-xs leading-[17px] text-ink-4 mt-3.5 pt-3 border-t border-rule">
            {t('bil_dalam_kategori', { count: worstBucket.count, bucket: worstBucket.label.toLowerCase() })}
          </Text>
        )}
      </Card>

      <Card className="p-[15px] mt-2.5">
        <Text className="font-sans-semi text-[13px] text-ink">{t('masa_setiap_langkah')}</Text>
        <View className="gap-2.5 mt-3.5">
          {hops.map((h) => (
            <View key={`${h.from}-${h.to}`} className="flex-row items-baseline gap-2.5">
              <Text className="flex-1 font-sans-med text-[12px] text-ink-2" numberOfLines={1}>
                {stageLabel(h.from, locale)} → {stageLabel(h.to, locale)}
              </Text>
              <Text className="font-mono text-[10px] text-ink-6">n={h.n}</Text>
              <Text
                className="font-mono-semi text-[12.5px]"
                style={{ color: h.avg > 4 ? C.fail : h.avg > 2 ? C.warn : C.ink }}
              >
                {h.avg}h
              </Text>
            </View>
          ))}
        </View>
        {slowest && (
          <Text className="font-sans text-xs leading-[17px] text-ink-4 mt-3.5 pt-3 border-t border-rule">
            {t('langkah_paling_lambat', {
              from: stageLabel(slowest.from, locale),
              to: stageLabel(slowest.to, locale),
              avg: slowest.avg,
            })}
          </Text>
        )}
      </Card>

      <Card className="p-[15px] mt-2.5">
        <Text className="font-sans-semi text-[13px] text-ink">{t('ikut_cawangan')}</Text>
        <View className="flex-row gap-2 mt-3.5 mb-1.5">
          <Text className="flex-1 font-mono-med text-[9.5px] uppercase tracking-label text-ink-5">
            {t('col_cawangan')}
          </Text>
          <Text className="w-[54px] text-right font-mono-med text-[9.5px] uppercase tracking-label text-ink-5">
            {t('col_buka')}
          </Text>
          <Text className="w-[54px] text-right font-mono-med text-[9.5px] uppercase tracking-label text-ink-5">
            {t('col_purata')}
          </Text>
          <Text className="w-[54px] text-right font-mono-med text-[9.5px] uppercase tracking-label text-ink-5">
            {t('col_tertua')}
          </Text>
        </View>
        {perBranch.length === 0 ? (
          <Text className="font-sans text-[12.5px] text-ink-4 mt-1">{t('tiada_rekod_pulangan')}</Text>
        ) : (
          perBranch.map((row) => (
            <View key={row.branch.id} className="flex-row gap-2 items-baseline py-2 border-t border-rule">
              <Text className="flex-1 font-sans-med text-[12.5px] text-ink-2" numberOfLines={1}>
                {row.branch.short}
              </Text>
              <Text className="w-[54px] text-right font-mono-semi text-[12.5px] text-ink">
                {row.open}
              </Text>
              <Text className="w-[54px] text-right font-mono text-[12.5px] text-ink-3">
                {row.avg}h
              </Text>
              <Text
                className="w-[54px] text-right font-mono-semi text-[12.5px]"
                style={{ color: row.oldest > 7 ? C.fail : row.oldest > 3 ? C.warn : C.ink3 }}
              >
                {row.oldest}h
              </Text>
            </View>
          ))
        )}
      </Card>

      {worstOpen.length > 0 && (
        <>
          <Text className="font-sans-semi text-[13.5px] text-ink mt-5 mb-2.5">
            {t('paling_lama_terbuka')}
          </Text>
          <View className="gap-2">
            {worstOpen.map((r) => (
              <ReturnRow key={r.id} record={r} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
