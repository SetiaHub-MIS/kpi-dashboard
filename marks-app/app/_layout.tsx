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
import { Href, Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UpdateBanner } from '@/components/UpdateBanner';
import { HOME_ROUTE, mayOpen } from '@/data/routes';
import { SessionEnd } from '@/data/sessionLimits';
import { takeCarriedNotice, useAppUpdates } from '@/lib/appUpdates';
import { hydrateDirectory, signOutAndClear } from '@/lib/hydrate';
// Imported for its listener: Chrome fires the install offer once, early, and
// it has to be caught before any screen has mounted.
import '@/lib/install';
import {
  arrivedWithResetLink,
  checkSession,
  endedMessage,
  limitsApply,
  noteActivity,
  startSession,
} from '@/lib/sessionGuard';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useLocale } from '@/store/useLocale';
import { useQueue } from '@/store/useQueue';
import { findUser, useUsers } from '@/store/useUsers';
import { useSession } from '@/store/useSession';

SplashScreen.preventAutoHideAsync();

/** Reachable with nobody signed in: the way in, and the way back in. */
const PUBLIC_ROUTES = new Set(['/', '/reset-password']);

/** How often an open app checks the session limits (lib/sessionGuard.ts). */
const CHECK_EVERY_MS = 30_000;

/**
 * A limit reached: this device is signed out — the same login elsewhere
 * carries on — and the sign-in form says why. Queued marks stay queued, as
 * with any sign-out (lib/hydrate.ts).
 */
async function endSession(reason: SessionEnd): Promise<void> {
  await signOutAndClear('local').catch(() => {});
  useSession.setState({ error: endedMessage(reason) });
}

/** Any touch or scroll counts as use; returning false leaves it to the screen. */
const sawActivity = () => {
  noteActivity();
  return false;
};

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
    void useLocale.getState().load();
    restore().then(async () => {
      if (!live) return;
      if (!useSession.getState().staff) {
        // Restarted into an update on the sign-in screen: say again why the
        // last session ended, as the screen did before the restart.
        const notice = await takeCarriedNotice();
        if (notice && live && !useSession.getState().currentUserId) useSession.setState({ error: notice });
        return;
      }
      // A stored session resumes only within its limits. One that arrived in a
      // password-reset link has just begun, so its clocks start now.
      if (limitsApply) {
        if (arrivedWithResetLink) startSession();
        const reason = await checkSession();
        if (reason) {
          await endSession(reason);
          return;
        }
      }
      // Drain before loading: a mark that syncs now should be in the directory
      // that follows it, rather than appearing only after the next restart.
      await useQueue.getState().drain(nameOf);
      if (live) void hydrateDirectory();
    });
    return () => {
      live = false;
    };
  }, [restore]);

  // Every screen but the way-in ones requires a session. RLS already refuses
  // the data underneath it — a supervisor querying another branch gets zero
  // rows — but that is not the same as the UI never having offered the
  // screen at all. A deep link straight to /admin with nobody signed in used
  // to render that screen's empty shell; now it bounces to sign-in instead.
  // /reset-password stays open so an expired link can say so, rather than
  // silently landing on the sign-in form.
  //
  // Signed in is not enough either: each role's section (/manager, /admin,
  // /supervisor, …) is theirs alone, and a typed URL into someone else's goes
  // back to your own home. Staff could otherwise open /manager/tugasan.
  const status = useSession((s) => s.status);
  const currentUserId = useSession((s) => s.currentUserId);
  const role = useSession((s) => s.staff?.role);
  const pathname = usePathname();
  const router = useRouter();

  // A newer version downloaded over the air restarts the app at once while
  // nobody is signed in (or a stored session is still being restored, which
  // counts as signed in); a signed-in person is offered the restart instead.
  const updates = useAppUpdates(!!currentUserId || status === 'restoring');

  useEffect(() => {
    if (!isSupabaseConfigured) return; // demo mode has no real session to check
    if (status === 'restoring') return; // a stored session may still resolve
    if (!currentUserId && !PUBLIC_ROUTES.has(pathname)) router.replace('/');
    else if (role && !mayOpen(role, pathname)) router.replace(HOME_ROUTE[role] as Href);
  }, [status, currentUserId, role, pathname, router]);

  // While someone is signed in: check the limits every half minute, and as
  // soon as the app comes back to the front — timers do not run while a phone
  // is locked or the app is in the background. On the web, typing counts as
  // use too (touches are caught by the root view below).
  useEffect(() => {
    if (!limitsApply || !currentUserId) return;
    const check = async () => {
      const reason = await checkSession();
      if (reason && useSession.getState().currentUserId) await endSession(reason);
    };
    const timer = setInterval(() => void check(), CHECK_EVERY_MS);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    const onKey = () => noteActivity();
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    if (web) {
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('wheel', onKey, { capture: true, passive: true });
    }
    return () => {
      clearInterval(timer);
      appState.remove();
      if (web) {
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('wheel', onKey, true);
      }
    };
  }, [currentUserId]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponderCapture={sawActivity}
        onMoveShouldSetResponderCapture={sawActivity}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F4F4F2' },
          }}
        />
        {updates.offer && <UpdateBanner onRestart={updates.restart} onLater={updates.dismiss} />}
      </View>
    </SafeAreaProvider>
  );
}
