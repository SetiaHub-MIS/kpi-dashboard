import { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  /** Extra bottom room so content clears a floating bar. */
  bottomInset?: number;
};

export function Screen({ children, bottomInset = 0 }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-app">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 18,
          paddingBottom: 24 + bottomInset,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}
