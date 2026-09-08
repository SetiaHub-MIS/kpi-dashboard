import { Text, View } from 'react-native';

export function Avatar({ init, size = 34 }: { init: string; size?: number }) {
  return (
    <View
      className="bg-[#E4E4E1] items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text
        className="font-mono-semi text-ink-3"
        style={{ fontSize: size <= 34 ? 11.5 : 13 }}
      >
        {init}
      </Text>
    </View>
  );
}
