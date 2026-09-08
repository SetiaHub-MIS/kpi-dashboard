import { Text, View } from 'react-native';
import { FORM, Kategori } from '@/data/checklist';
import { useMarks } from '@/store/useMarks';
import { pctColor } from '@/theme/scoring';

/** Per-kategori score breakdown, index-aligned with the given form. */
export function PerkaraBars({
  values,
  form = FORM,
}: {
  values: number[];
  form?: Kategori[];
}) {
  const pass = useMarks((s) => s.passThreshold);
  return (
    <View className="gap-3">
      {form.map((k, i) => {
        const v = values[i] ?? 0;
        const color = pctColor(v, pass);
        return (
          <View key={k.no}>
            <View className="flex-row justify-between items-baseline gap-2.5">
              <Text className="font-sans-med text-[12.5px] text-ink-2 flex-1" numberOfLines={1}>
                {k.name}
              </Text>
              <Text className="font-mono-semi text-[12.5px]" style={{ color }}>
                {v}%
              </Text>
            </View>
            <View className="h-[5px] rounded-[3px] bg-rule mt-[7px] overflow-hidden">
              <View
                className="h-full rounded-[3px]"
                style={{ width: `${Math.max(0, Math.min(100, v))}%`, backgroundColor: color }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
