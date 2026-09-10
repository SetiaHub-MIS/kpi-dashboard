import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';
import { useT } from '@/store/useLocale';

export default function PulanganLayout() {
  const t = useT();
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_aktif'), tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="selesai"
        options={{ title: t('tab_selesai'), tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="saya"
        options={{ title: t('tab_kpi_saya'), tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
