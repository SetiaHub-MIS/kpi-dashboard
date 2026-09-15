import { Tabs } from 'expo-router';
import { baseTabOptions, tabIcon } from '@/components/tabOptions';
import { useT } from '@/store/useLocale';

export default function AdminLayout() {
  const t = useT();
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_pengguna'), tabBarIcon: tabIcon('people') }}
      />
      <Tabs.Screen
        name="peranan"
        options={{ title: t('tab_peranan'), tabBarIcon: tabIcon('id-card') }}
      />
      <Tabs.Screen
        name="cawangan"
        options={{ title: t('tab_cawangan'), tabBarIcon: tabIcon('storefront') }}
      />
    </Tabs>
  );
}
