import { Tabs } from 'expo-router';
import { baseTabOptions, dotIcon } from '@/components/tabOptions';

/**
 * Human Resources. The one head-office role that goes past the outlet summary:
 * HR reads individual marking sheets, the stor KPI and the returns flow, so it
 * gets the report plus both drill-downs. The Area Manager's tugasan self-check
 * is deliberately not here — HR reads whether it was done, on the report, and
 * never fills it in.
 */
export default function HrLayout() {
  return (
    <Tabs screenOptions={baseTabOptions}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Laporan', tabBarIcon: dotIcon('square') }}
      />
      <Tabs.Screen
        name="markah"
        options={{ title: 'Markah', tabBarIcon: dotIcon('circle') }}
      />
      <Tabs.Screen
        name="pulangan"
        options={{ title: 'Pulangan', tabBarIcon: dotIcon('circle') }}
      />
    </Tabs>
  );
}
