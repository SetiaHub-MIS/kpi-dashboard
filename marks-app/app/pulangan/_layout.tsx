import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';

export default function PulanganLayout() {
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Aktif', tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="selesai"
        options={{ title: 'Selesai', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="saya"
        options={{ title: 'KPI saya', tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
