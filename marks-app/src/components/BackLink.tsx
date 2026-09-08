import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

export function BackLink({ label }: { label: string }) {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={10}
      accessibilityRole="button"
    >
      <Text className="font-sans-med text-sm text-ink-4">← {label}</Text>
    </Pressable>
  );
}
