import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { RunningCode, runningCode, shouldRecheck, updateStep } from '@/data/updatePolicy';
import { useSession } from '@/store/useSession';

/**
 * App updates over the air (EAS Update). The installed APK checks for a newer
 * JavaScript bundle on its channel every time it launches (app.json
 * `updates`), and this checks again whenever the app comes back to the front.
 * What it downloads is put to use as data/updatePolicy.ts says: at once when
 * nobody is signed in, otherwise when the person taps "Mula semula", and in
 * any case the next time the app is opened.
 *
 * Off in development, Expo Go and the web build. The web build is always the
 * latest deploy anyway, and expo-updates' web stub claims to be enabled.
 */
export const updatesActive = Platform.OS !== 'web' && Updates.isEnabled;

/** The code this launch is running, for the account screen's version line. */
export function runningCodeNow(): RunningCode {
  return runningCode({
    web: Platform.OS === 'web',
    enabled: Updates.isEnabled,
    embedded: Updates.isEmbeddedLaunch,
    updateId: Updates.updateId,
    createdAt: Updates.createdAt,
  });
}

/** The sign-in screen's notice, kept across a restart into an update. */
const NOTICE_KEY = 'checklist.signin-notice.v1';

/** Asks the update server for anything newer and downloads it. Offline: the next check tries again. */
async function checkAndFetch(): Promise<void> {
  try {
    const found = await Updates.checkForUpdateAsync();
    if (found.isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // No signal or the server refused; nothing on screen depends on it.
  }
}

/**
 * Restarts into the downloaded update. The sign-in screen's notice — why the
 * last session ended — is in memory only, so it is set aside to show again
 * after the restart.
 */
export async function restartIntoUpdate(): Promise<void> {
  try {
    const notice = useSession.getState().error;
    if (notice) await AsyncStorage.setItem(NOTICE_KEY, notice);
    await Updates.reloadAsync();
  } catch {
    // Stays on the running version; the next launch applies the update.
  }
}

/** After a restart into an update: the notice that was showing before it, once. */
export async function takeCarriedNotice(): Promise<string | null> {
  try {
    const notice = await AsyncStorage.getItem(NOTICE_KEY);
    if (notice !== null) await AsyncStorage.removeItem(NOTICE_KEY);
    return notice;
  } catch {
    return null;
  }
}

/**
 * Keeps the app on its newest update. `signedIn` decides whether a downloaded
 * update restarts the app now or is offered: `offer` is true while the
 * "new version ready" card should show.
 */
export function useAppUpdates(signedIn: boolean) {
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);

  // Launch checks itself; coming back to the front checks again, now and then.
  useEffect(() => {
    if (!updatesActive) return;
    let lastCheckAt = Date.now();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !shouldRecheck(lastCheckAt, Date.now())) return;
      lastCheckAt = Date.now();
      void checkAndFetch();
    });
    return () => sub.remove();
  }, []);

  const step = updatesActive ? updateStep({ downloaded: isUpdatePending, signedIn }) : 'wait';
  useEffect(() => {
    if (step === 'restart') void restartIntoUpdate();
  }, [step]);

  return {
    offer: step === 'offer' && !dismissed,
    restart: () => void restartIntoUpdate(),
    dismiss: () => setDismissed(true),
  };
}
