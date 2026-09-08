import { View } from 'react-native';
import { C } from '@/theme/scoring';

/** Shared chrome for all three role tab bars. */
export const baseTabOptions = {
  headerShown: false,
  sceneStyle: { backgroundColor: C.app },
  tabBarStyle: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  // Explicit lineHeight keeps descenders ("g" in Ringkasan) off the clip edge.
  tabBarLabelStyle: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 10.5,
    lineHeight: 14,
  },
  tabBarActiveTintColor: C.ink,
  tabBarInactiveTintColor: C.ink6,
} as const;

/** The design's abstract tab glyph: a square for "home", a circle otherwise. */
export function dotIcon(shape: 'square' | 'circle') {
  return function Dot({ focused }: { focused: boolean }) {
    return (
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: shape === 'square' ? 4 : 8,
          backgroundColor: focused ? C.ink : C.ink8,
        }}
      />
    );
  };
}
