# AGENTS.md — kpi-dashboard (Checklist Mingguan)

A weekly performance-checklist system for retail branches. Two parts: the phone app and the backend.

## Project map

```
marks-app/     Expo SDK 57 phone app (React Native + TypeScript + Expo Router)
  app/           File-based routes — one screen per file
  src/
    components/  Shared UI (Screen, Card, MarksOutletPicker, ReturnPhotos, …)
    data/        Pure logic, no React imports (scoring, routes, users, returns, …)
    store/       Zustand stores (useSession, useUsers, useMarks, useReturns, …)
    lib/         Supabase client, auth, hydration, asset helpers
    i18n/        Labels and strings (Bahasa Malaysia)
    theme/       Scoring colour tokens
  tests/         Node native test runner — `*.test.mjs`
supabase/
  migrations/    Run in filename order. Requires PostgreSQL 15+ (security_invoker views).
  functions/     Edge Functions: payroll-auth, purge-return-photos, xlsx-export
  tests/         PGlite-based RLS policy tests
  seed.sql       Workbook seed data
docs/            Reference docs (database.md is the authoritative DB reference)
db/              Superseded ERD — use docs/database.md instead
graphify-out/    Knowledge graph — use `graphify query` for codebase questions
```

## Commands

Run from `marks-app/`:

```bash
npm start                  # Expo dev server
npm test                   # Node --test "tests/**/*.test.mjs"
npm run typecheck          # tsc --noEmit (strict mode)
```

Run from root:

```bash
npm run test:rls           # PGlite RLS policy tests (supabase/tests/rls.test.mjs)
npm run verify:policies    # Generate policy verification (supabase/tests/gen_verify.mjs)
```

`npm test` in marks-app needs `--import ./tests/register-alias.mjs` because Node's test runner does not read tsconfig `paths`. The alias `@/` → `./src/` is resolved by `tests/resolve-alias.mjs`. Do not remove or bypass this.

## Framework constraints

- **Expo SDK 57.** Read `https://docs.expo.dev/versions/v57.0.0/` before writing any Expo code. The SDK version is pinned and breaking changes between versions are common.
- **TypeScript strict mode.** `tsconfig.json` extends `expo/tsconfig.base` with `"strict": true`. No implicit any, no unchecked nulls.
- **Tailwind via NativeWind.** `darkMode: 'class'` — the app is light-only. Use the custom colour tokens defined in `tailwind.config.js` (canvas, app, card, ink, pass, warn, fail, link). Do not use arbitrary Tailwind colours.
- **Expo Router** with `typedRoutes: true`. File-based routing. The `app/` directory is the router.

## Architecture notes

**Offline-first.** The app works without Supabase. Zustand stores hold seed data and the app is fully functional on in-memory data. `isSupabaseConfigured` (in `src/lib/supabase.ts`) gates server calls. Never assume Supabase is available at dev time.

**Auth.** Users sign in with their payroll number (e.g. `KP0093`), which is turned into `kp0093@checklist.local` for Supabase Auth. No real email — the address is plumbing. The `EXPO_PUBLIC_AUTH_EMAIL_DOMAIN` env var must match `supabase/provision_logins.sql`.

**Scoring rules.** A blank/N/A answer is **not** zero. Lines marked N/A are excluded from the denominator. Zero is an intentional score that counts against the person. See `src/data/scoring.ts`.

**Role system.** Nine roles: `staff`, `store`, `clerk`, `supervisor`, `area_manager`, `manager`, `general_manager`, `human_resources`, `admin`. Each role lands on a different section after sign-in (`src/data/routes.ts`). RLS scopes what data each role sees.

**Database.** PostgreSQL 15+ required. Views use `security_invoker` (Postgres 15 feature) — without it, views run as owner and bypass RLS. Migrations are in `supabase/migrations/`, applied with `supabase db push`. The authoritative DB reference is `docs/database.md`.

**RLS testing.** `supabase/tests/rls.test.mjs` runs against PGlite (in-process Postgres). It applies every migration and seed file, then asserts that policies actually scope reads and writes. Run before committing any migration change.

**Build/deploy.** Web: Vercel (`marks-app/vercel.json`). Phone APK: EAS Build (`marks-app/eas.json`). Updates: EAS Update (runtime version tracks `appVersion`). The Vercel build injects `EXPO_PUBLIC_BUILD_COMMIT` and `EXPO_PUBLIC_BUILD_TIME` so the app displays its version.

**Language.** The app is in Bahasa Malaysia (`lang: "ms"`). Labels live in `src/i18n/`. New UI strings go there.

## graphify

This repo has a knowledge graph at `graphify-out/`. For codebase questions, run `graphify query "<question>"` before grepping. After modifying code, run `graphify update .` (AST-only, no API cost). See root `CLAUDE.md` for full rules.
