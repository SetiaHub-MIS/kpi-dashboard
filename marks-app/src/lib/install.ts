import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Getting the web app onto the home screen.
 *
 * Chrome on Android decides for itself when to offer "Install app", and only
 * fires `beforeinstallprompt` in a real Chrome tab — never inside another
 * app's browser (WhatsApp, Facebook, Telegram open links in their own), and
 * never on iPhone, where Safari only ever installs through the share sheet.
 * That is why one tester was asked to install and another saw only "Salin":
 * they opened the same link in different browsers.
 *
 * This holds on to Chrome's event so the sign-in screen can offer the
 * install itself, and for every other browser says which menu to use.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallState =
  /** Not on the web, or already running from the home screen. */
  | { kind: 'hidden' }
  /** Chrome offered the install; `prompt()` shows its own dialog. */
  | { kind: 'prompt' }
  /** Safari on iPhone/iPad: share sheet → Add to Home Screen. */
  | { kind: 'ios' }
  /** Opened inside another app: needs to be opened in the real browser first. */
  | { kind: 'in-app' }
  /** A browser that can install from its own menu but has not offered it here. */
  | { kind: 'menu' };

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

if (isWeb) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

const isStandalone = () =>
  isWeb &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true);

const ua = () => (isWeb ? navigator.userAgent : '');

const isIos = () => /iPhone|iPad|iPod/i.test(ua());

/** The in-app browsers staff actually paste links into. */
const isInAppBrowser = () =>
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|Telegram|TikTok|; wv\)/i.test(ua());

export function installState(): InstallState {
  if (!isWeb || installed || isStandalone()) return { kind: 'hidden' };
  if (deferred) return { kind: 'prompt' };
  if (isIos()) return { kind: 'ios' };
  if (isInAppBrowser()) return { kind: 'in-app' };
  return { kind: 'menu' };
}

/** Shows Chrome's own install dialog. Resolves to whether they accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  // Chrome only lets the event be used once either way.
  deferred = null;
  notify();
  return outcome === 'accepted';
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const snapshot = () => installState().kind;

export function useInstallState(): InstallState['kind'] {
  return useSyncExternalStore(subscribe, snapshot, () => 'hidden' as const);
}
