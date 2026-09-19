import { Tabs } from 'expo-router';
import { baseTabOptions, tabIcon } from '@/components/tabOptions';
import { useT } from '@/store/useLocale';

export default function SupervisorLayout() {
  const t = useT();
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_checklist'), tabBarIcon: tabIcon('clipboard') }}
      />
      <Tabs.Screen
        name="rekod"
        options={{ title: t('tab_rekod'), tabBarIcon: tabIcon('time') }}
      />
      <Tabs.Screen
        name="pekerja"
        options={{ title: t('tab_pekerja'), tabBarIcon: tabIcon('people') }}
      />
      <Tabs.Screen
        name="peringatan"
        options={{ title: t('peringatan'), tabBarIcon: tabIcon('notifications') }}
      />
    </Tabs>
  );
}
