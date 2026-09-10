import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';
import { useT } from '@/store/useLocale';

export default function StaffLayout() {
  const t = useT();
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_markah_saya'), tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="rekod"
        options={{ title: t('tab_rekod'), tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: t('tab_profil'), tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
