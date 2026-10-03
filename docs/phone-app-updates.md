# Phone app updates (EAS Update)

The Android app updates itself. Phones download a new version of the app's
code from Expo when the app is opened, so most changes reach everyone without
building or installing a new APK.

## Once: the last APK installed by hand

APKs built before 4 Oct 2026 have no updater in them and never update. Build one
with the updater and install it on every phone, in place of the old one:

```
cd marks-app
npx eas-cli build --profile preview --platform android
```

The preview profile builds on the `preview` channel (`eas.json`), so this APK
takes the updates published to `preview`.

## Every change after that: publish an update

Commit the change, then from `marks-app`:

```
npx eas-cli update --channel preview --environment preview --message "What changed"
```

`--environment preview` bundles the Supabase URL and anon key from the EAS
`preview` environment, the same values the APK was built with. Without them
the update would start in demo mode or not at all. Check they are there with
`npx eas-cli env:list --environment preview` (`EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`).

## What a phone does with it

- **On opening the app** it asks Expo for a newer update on its channel and
  downloads it in the background. Coming back to the app checks again, at most
  every 10 minutes.
- **Nobody signed in** (the sign-in screen, which is where everyone lands after
  15 idle minutes): the app restarts into the new version straight away. The
  sign-in screen's "you were signed out" notice is kept across the restart.
- **Someone signed in**: a "Versi baharu sedia" card offers **Mula semula**.
  It does not restart by itself, because a restart drops a checklist that is
  being filled in. Marks already waiting to send are kept either way.
- **In any case**, the next time the app is closed and opened again, it runs
  the new version.

The code: `marks-app/src/lib/appUpdates.ts`, the rule in
`marks-app/src/data/updatePolicy.ts`, the card in
`marks-app/src/components/UpdateBanner.tsx`, settings in `app.json`
(`updates`, `runtimeVersion`) and `eas.json` (`channel`).

## When a new APK is still needed

An update carries the app's JavaScript, text and images only. A change that
touches the native app needs a new APK:

- adding or upgrading a package with native code (camera, file system,
  notifications, …), or upgrading the Expo SDK;
- changing `app.json` settings such as the name, icon, splash screen,
  permissions or package name.

For those, raise `"version"` in `marks-app/app.json` (1.0.0 → 1.1.0) and build a
new APK as above. The runtime version follows `"version"`
(`runtimeVersion.policy: "appVersion"`), so updates published after that reach
only the APKs built with the new number, and a phone on the old APK is never
sent code it cannot run. Raising the number without a native change does no
harm; forgetting it after one is what breaks phones, so when in doubt, raise it.

## Cost

Expo's free plan includes updates for a limited number of phones a month; see
https://expo.dev/pricing for the current limits.
