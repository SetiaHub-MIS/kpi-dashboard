import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import {
  REASON_LABEL,
  ReturnRecord,
  STAGE_LABEL,
  STAGE_OWNER,
  Stage,
  StageOwner,
  ageBand,
  fmtDate,
  isCleared,
  nextStage,
  turnaroundDays,
} from '@/data/returns';
import { C } from '@/theme/scoring';

const BAND_COLOR = { ok: C.ink, warn: C.warn, late: C.fail } as const;
const BAND_BG = { ok: C.rule, warn: C.warnBg, late: C.failBg } as const;

/** One bill in the returns list, showing where it is and how long it has taken. */
export function ReturnRow({
  record,
  /** Highlights rows whose next step belongs to this role; null for read-only viewers. */
  mine,
}: {
  record: ReturnRecord;
  mine?: StageOwner | null;
}) {
  const cleared = isCleared(record);
  const days = turnaroundDays(record);
  const band = cleared ? 'ok' : ageBand(days);
  const stage: Stage | null = nextStage(record);
  const isMine = !!mine && stage != null && STAGE_OWNER[stage] === mine;

  return (
    <Pressable
      onPress={() => router.push(`/bil/${record.id}`)}
      accessibilityRole="button"
      className="bg-card border rounded-xl px-3.5 py-3 active:opacity-70"
      style={{ borderColor: isMine ? C.ink : C.line }}
    >
      <View className="flex-row items-center gap-2.5">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <Text className="font-sans-semi text-[13.5px] text-ink">{record.billNo}</Text>
            <View
              className="px-1.5 py-[3px] rounded"
              style={{ backgroundColor: record.reason === 'damage' ? C.warnBg : C.failBg }}
            >
              <Text
                className="font-mono-semi text-[9px]"
                style={{ color: record.reason === 'damage' ? C.warnInk : C.fail }}
              >
                {REASON_LABEL[record.reason].toUpperCase()}
              </Text>
            </View>
          </View>
          <Text className="font-mono text-[10.5px] text-ink-5 mt-1">
            Bil {fmtDate(record.billDate)} · {record.supplier}
          </Text>
        </View>

        <View className="items-end">
          <View
            className="px-2 py-[5px] rounded-lg"
            style={{ backgroundColor: BAND_BG[band] }}
          >
            <Text className="font-mono-semi text-[12.5px]" style={{ color: BAND_COLOR[band] }}>
              {days}h
            </Text>
          </View>
          <Text className="font-mono text-[9px] text-ink-6 mt-1">
            {cleared ? 'SELESAI' : 'TERBUKA'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2 mt-2.5 pt-2.5 border-t border-rule">
        <View
          className="w-[6px] h-[6px] rounded-full"
          style={{ backgroundColor: cleared ? C.pass : isMine ? C.ink : C.ink8 }}
        />
        <Text className="flex-1 font-sans-med text-[11.5px] text-ink-3" numberOfLines={1}>
          {stage ? `Seterusnya: ${STAGE_LABEL[stage]}` : 'Stok sudah dilaraskan'}
        </Text>
        {isMine && (
          <Text className="font-mono-semi text-[9px]" style={{ color: C.ink }}>
            TINDAKAN ANDA
          </Text>
        )}
      </View>
    </Pressable>
  );
}
