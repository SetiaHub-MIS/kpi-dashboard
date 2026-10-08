import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIN_VISIBLE_MS, SHOW_AFTER_MS, activityKind, type RequestKind } from '@/data/activity';
import { useActivity } from '@/store/useActivity';
import { useT } from '@/store/useLocale';
import { C } from '@/theme/scoring';

/**
 * The app's "working on it" signal, over every screen: a moving line across
 * the top and a "Memuatkan…" / "Menyimpan…" chip under it, whenever anything
 * is loading from or saving to the server (data/activity.ts). A request
 * quicker than SHOW_AFTER_MS shows nothing; once shown, it stays at least
 * MIN_VISIBLE_MS. It never takes a tap — the screen under it stays usable.
 */
export function ActivityBar() {
  const live = useActivity((s) => activityKind(s.loads, s.saves));
  const shown = useShown(live);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const t = useT();

  const x = useRef(new Animated.Value(0)).current;
  const visible = shown != null;
  useEffect(() => {
    if (!visible) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, x]);

  if (!shown) return null;

  const label = shown === 'save' ? t('menyimpan') : t('memuatkan');
  const segment = width * 0.35;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      className="absolute left-0 right-0 items-center"
      style={{ top: insets.top, pointerEvents: 'none' }}
    >
      <View className="self-stretch h-[3px] overflow-hidden" style={{ backgroundColor: C.rule }}>
        <Animated.View
          style={{
            width: segment,
            height: 3,
            backgroundColor: C.ink,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-segment, width] }) }],
          }}
        />
      </View>
      <View
        className="flex-row items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-ink"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }}
      >
        <ActivityIndicator size="small" color="#fff" />
        <Text className="font-sans-semi text-[12px] text-white">{label}</Text>
      </View>
    </View>
  );
}

/**
 * `live` as the screen should show it: not before SHOW_AFTER_MS of work, and
 * once shown, not gone before MIN_VISIBLE_MS. A save that starts while it is
 * up changes the label at once.
 */
function useShown(live: RequestKind | null): RequestKind | null {
  const [shown, setShown] = useState<RequestKind | null>(null);
  const shownAt = useRef(0);

  useEffect(() => {
    if (live) {
      if (shown) {
        if (shown !== live) setShown(live);
        return;
      }
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShown(live);
      }, SHOW_AFTER_MS);
      return () => clearTimeout(timer);
    }
    if (!shown) return;
    const timer = setTimeout(
      () => setShown(null),
      Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current)),
    );
    return () => clearTimeout(timer);
  }, [live, shown]);

  return shown;
}
