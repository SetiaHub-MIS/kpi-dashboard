import { Pressable, Text, View } from 'react-native';
import { MONTHS, PERIODS, WEEK_COLS } from '@/data/checklist';
import { weekRangeLabel, weekStarted } from '@/data/period';
import { selectMonth } from '@/lib/hydrate';
import { useT } from '@/store/useLocale';
import { useMarks } from '@/store/useMarks';
import { C } from '@/theme/scoring';

/**
 * Which month, and optionally which of its four weeks, the screen is on.
 *
 * Marking used to be pinned to today's week. The paper form never was — a
 * supervisor who missed a week filled it in the next — so the week is a
 * choice, bounded only by time: a week can be picked once it has started,
 * and a month once it is on the switcher. Whether a given person's week is
 * still open to change is the verification's call, not this control's.
 */
export function PeriodPicker({ weeks = false }: { weeks?: boolean }) {
  const monthIdx = useMarks((s) => s.monthIdx);
  const weekIdx = useMarks((s) => s.weekIdx);
  const loading = useMarks((s) => s.periodLoading);
  const setWeek = useMarks((s) => s.setWeek);
  const t = useT();
  const period = PERIODS[monthIdx];

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-semi text-2xl text-ink">{MONTHS[monthIdx]}</Text>
        <View className="flex-row items-center gap-1.5">
          {loading && (
            <Text className="font-sans text-[11px] text-ink-5 mr-1">{t('memuatkan')}</Text>
          )}
          <StepButton
            label="‹"
            a11y={t('bulan_sebelum')}
            onPress={() => void selectMonth(monthIdx - 1)}
            disabled={loading || monthIdx === 0}
          />
          <StepButton
            label="›"
            a11y={t('bulan_selepas')}
            onPress={() => void selectMonth(monthIdx + 1)}
            disabled={loading || monthIdx === MONTHS.length - 1}
          />
        </View>
      </View>

      {weeks && (
        <View className="flex-row gap-1.5 mt-3">
          {WEEK_COLS.map((label, i) => {
            const on = i === weekIdx;
            const open = weekStarted(period, i);
            return (
              <Pressable
                key={label}
                onPress={() => setWeek(i)}
                disabled={!open}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !open }}
                accessibilityLabel={t('minggu_n', { n: i + 1 })}
                className="flex-1 py-2 rounded-lg border items-center"
                style={{
                  borderColor: on ? 'transparent' : C.line,
                  backgroundColor: on ? C.ink : C.card,
                  opacity: open ? 1 : 0.4,
                }}
              >
                <Text
                  className="font-mono-semi text-[12px]"
                  style={{ color: on ? '#fff' : C.ink3 }}
                >
                  {label}
                </Text>
                <Text
                  className="font-mono text-[9.5px] mt-0.5"
                  style={{ color: on ? '#C9C9C4' : C.ink6 }}
                >
                  {weekRangeLabel(period, i + 1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function StepButton({
  label,
  a11y,
  onPress,
  disabled,
}: {
  label: string;
  a11y: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      className="w-[34px] h-[34px] rounded-[9px] border border-line bg-card items-center justify-center active:opacity-60"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Text className="font-mono-med text-sm text-ink-3">{label}</Text>
    </Pressable>
  );
}
