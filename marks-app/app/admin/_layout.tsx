import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';
import { useT } from '@/store/useLocale';

export default function AdminLayout() {
  const t = useT();
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_pengguna'), tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="peranan"
        options={{ title: t('tab_peranan'), tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="cawangan"
        options={{ title: t('tab_cawangan'), tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
