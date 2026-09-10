import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';

export default function ManagerLayout() {
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Ringkasan', tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="gaps"
        options={{ title: 'Belum dinilai', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="assets"
        options={{ title: 'Aset kedai', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="sv"
        options={{ title: 'Checklist SV', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="tugasan"
        options={{ title: 'Tugasan saya', tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
