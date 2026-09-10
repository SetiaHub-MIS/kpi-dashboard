import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';

export default function SupervisorLayout() {
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Checklist', tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="rekod"
        options={{ title: 'Rekod', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="pekerja"
        options={{ title: 'Pekerja', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="soalan"
        options={{ title: 'Soalan', tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
