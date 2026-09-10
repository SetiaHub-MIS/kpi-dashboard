import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';
import { useT } from '@/store/useLocale';

export default function ManagerLayout() {
  const t = useT();
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_ringkasan'), tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="gaps"
        options={{ title: t('tab_belum_dinilai'), tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="assets"
        options={{ title: t('tab_aset_kedai'), tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="sv"
        options={{ title: t('tab_checklist_sv'), tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="tugasan"
        options={{ title: t('tab_tugasan_saya'), tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
