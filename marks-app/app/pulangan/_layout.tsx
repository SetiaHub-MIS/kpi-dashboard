import { Tabs } from 'expo-router';
import { baseTabOptions, tabIcon } from '@/components/tabOptions';
import { useT } from '@/store/useLocale';

export default function PulanganLayout() {
  const t = useT();
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_aktif'), tabBarIcon: tabIcon('hourglass') }}
      />
      <Tabs.Screen
        name="selesai"
        options={{ title: t('tab_selesai'), tabBarIcon: tabIcon('checkmark-circle') }}
      />
      <Tabs.Screen
        name="saya"
        options={{ title: t('tab_kpi_saya'), tabBarIcon: tabIcon('speedometer') }}
      />
    </Tabs>
  );
}
