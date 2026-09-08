import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Pengguna', tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="peranan"
        options={{ title: 'Peranan', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="cawangan"
        options={{ title: 'Cawangan', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="pulangan"
        options={{ title: 'Pulangan', tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
