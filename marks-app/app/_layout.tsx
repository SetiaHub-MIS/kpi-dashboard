import '../global.css';

import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
  useFonts,
} from '@expo-google-fonts/public-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydrateDirectory } from '@/lib/hydrate';
import { useQueue } from '@/store/useQueue';
import { findUser, useUsers } from '@/store/useUsers';
import { useSession } from '@/store/useSession';

SplashScreen.preventAutoHideAsync();

/** A rejection has to name a person months later, so the label is resolved now. */
const nameOf = (userId: string) =>
  findUser(useUsers.getState().users, userId)?.short ?? userId;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // A session stored on the device outlives a restart, so check for one before
  // showing the way in — and if it resolves, load the directory under it. Doing
  // only the first half left a reopened app quietly running on seed data.
  const restore = useSession((s) => s.restore);
  useEffect(() => {
    let live = true;
    void useQueue.getState().load();
    restore().then(async () => {
      if (!live || !useSession.getState().staff) return;
      // Drain before loading: a mark that syncs now should be in the directory
      // that follows it, rather than appearing only after the next restart.
      await useQueue.getState().drain(nameOf);
      if (live) void hydrateDirectory();
    });
    return () => {
      live = false;
    };
  }, [restore]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F4F4F2' },
        }}
      />
    </SafeAreaProvider>
  );
}
