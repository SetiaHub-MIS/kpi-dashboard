import { Ionicons, type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import type { ColorValue } from 'react-native';
import { C } from '@/theme/scoring';

/** Shared chrome for every role's tab bar. */
export const baseTabOptions = {
  headerShown: false,
  sceneStyle: { backgroundColor: C.app },
  // No height or vertical padding here: the bar is 49pt plus the device's
  // bottom inset, and a custom height switches that inset handling off.
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

type OutlineName = Extract<IoniconsIconName, `${string}-outline`>;
type BaseOf<T> = T extends `${infer B}-outline` ? B : never;
/** Ionicons names that exist in both filled and outline weights. */
export type TabGlyph = Extract<IoniconsIconName, BaseOf<OutlineName>>;

/**
 * Filled when focused, outline otherwise — the weight change is what reads as
 * "you are here" at a glance, before the tint does. The label beside it
 * carries the meaning, so the glyph itself is decorative.
 */
type TabIconProps = { focused: boolean; color: ColorValue; size: number };

export function tabIcon(name: TabGlyph) {
  const outline: IoniconsIconName = `${name}-outline`;
  return function Icon({ focused, color, size }: TabIconProps) {
    return <Ionicons name={focused ? name : outline} size={size} color={color} />;
  };
}
