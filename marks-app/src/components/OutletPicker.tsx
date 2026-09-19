import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useBranchLabel } from '@/store/useBranches';
import { useT } from '@/store/useLocale';
import { C } from '@/theme/scoring';

/**
 * A dropdown over the outlets an account covers. Shows the chosen outlet;
 * tapping opens the list beneath it, tapping an outlet picks it and closes.
 * Rendered only when there is a choice to make — with one outlet the caller
 * shows the name and nothing else.
 */
export function OutletPicker({
  outlets,
  value,
  onChange,
}: {
  outlets: string[];
  value: string;
  onChange: (branchId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const branchLabel = useBranchLabel();
  const t = useT();

  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={t('pilih_cawangan_a11y', { branch: branchLabel(value) })}
        accessibilityState={{ expanded: open }}
        className="flex-row items-center justify-between bg-card border rounded-[10px] px-3.5 py-3 active:opacity-70"
        style={{ borderColor: open ? '#C7C7C2' : C.line }}
      >
        <View className="min-w-0 flex-1">
          <Text className="font-mono-med text-[9.5px] uppercase tracking-label text-ink-5">
            {t('cawangan')}
          </Text>
          <Text className="font-sans-semi text-[14px] text-ink mt-1" numberOfLines={1}>
            {branchLabel(value)}
          </Text>
        </View>
        <Text className="font-mono text-[12px] text-ink-5 ml-3">{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open && (
        <View className="bg-card border border-line rounded-[10px] mt-1.5 overflow-hidden">
          {outlets.map((id, i) => {
            const on = id === value;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  onChange(id);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className="px-3.5 py-3 active:opacity-70"
                style={{
                  backgroundColor: on ? C.rule : C.card,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: C.rule,
                }}
              >
                <Text
                  className={on ? 'font-sans-semi text-[13.5px] text-ink' : 'font-sans-med text-[13.5px] text-ink-2'}
                >
                  {branchLabel(id)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
