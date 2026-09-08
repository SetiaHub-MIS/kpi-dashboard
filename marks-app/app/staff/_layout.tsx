import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';

export default function StaffLayout() {
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Markah saya', tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="rekod"
        options={{ title: 'Rekod', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: 'Profil', tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
