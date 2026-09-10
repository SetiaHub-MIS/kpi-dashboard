import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';
import { useT } from '@/store/useLocale';

export default function SupervisorLayout() {
  const t = useT();
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_checklist'), tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="rekod"
        options={{ title: t('tab_rekod'), tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="pekerja"
        options={{ title: t('tab_pekerja'), tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="soalan"
        options={{ title: t('tab_soalan'), tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
