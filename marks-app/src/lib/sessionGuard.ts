import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SessionEnd, SessionStamps, mergeStamps, sessionEnd } from '@/data/sessionLimits';
import { translate } from '@/i18n/strings';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useLocale } from '@/store/useLocale';

/**
 * Holds a signed-in session to its limits (src/data/sessionLimits.ts):
 * fifteen minutes without a tap or key press, or three hours from signing in.
 *
 * The record lives in memory, written through to AsyncStorage so a phone that
 * is closed and reopened an hour later is still held to it. Activity is
 * written at most every 15 seconds; the limits are minutes.
 */
const KEY = 'checklist.session.v1';
const WRITE_EVERY_MS = 15_000;

let stamps: SessionStamps | null = null;
let lastWrite = 0;

const isStamps = (v: unknown): v is SessionStamps =>
  typeof v === 'object' && v !== null &&
  typeof (v as SessionStamps).signedInAt === 'number' &&
  typeof (v as SessionStamps).lastActiveAt === 'number';

async function readStored(): Promise<SessionStamps | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStamps(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persist(): void {
  lastWrite = Date.now();
  const write = stamps ? AsyncStorage.setItem(KEY, JSON.stringify(stamps)) : AsyncStorage.removeItem(KEY);
  void write.catch(() => {
    // Held in memory for as long as the app stays open.
  });
}

/** A fresh sign-in: both clocks start now. */
export function startSession(now: number = Date.now()): void {
  stamps = { signedInAt: now, lastActiveAt: now };
  persist();
}

/** Signed out, by the person or by a limit. */
export function clearSession(): void {
  stamps = null;
  persist();
}

/**
 * The person touched the app. A session already past a limit is not revived
 * by it: the tap that wakes a phone after twenty idle minutes can land before
 * the check that ends the session.
 */
export function noteActivity(now: number = Date.now()): void {
  if (!stamps || sessionEnd(stamps, now)) return;
  stamps = { ...stamps, lastActiveAt: now };
  if (now - lastWrite >= WRITE_EVERY_MS) persist();
}

/**
 * Why the session on this device must end now, or null. Reads storage too: on
 * the web another tab may have been in use, and after a restart memory is
 * empty.
 */
export async function checkSession(now: number = Date.now()): Promise<SessionEnd | null> {
  stamps = mergeStamps(stamps, await readStored());
  return sessionEnd(stamps, now);
}

/** The line the sign-in form shows after a limit signed this device out. */
export function endedMessage(reason: SessionEnd): string {
  return translate(useLocale.getState().locale, `sesi_tamat_${reason}`);
}

/**
 * A password-reset link signs the person in from the URL (web only), not
 * through the sign-in form, so that session has no clocks yet. Read when the
 * app first loads, before Supabase clears the link from the address bar; the
 * root layout starts the clocks for it.
 */
export const arrivedWithResetLink =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  /(^|[#?&])type=recovery(&|$)/.test(`${window.location.hash}&${window.location.search}`);

/** True when the limits apply at all: demo runs have no real session. */
export const limitsApply = isSupabaseConfigured;
