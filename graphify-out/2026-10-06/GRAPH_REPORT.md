# Graph Report - Performance marking app dashboard  (2026-10-06)

## Corpus Check
- 193 files · ~322,641 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1286 nodes · 4175 edges · 87 communities (59 shown, 28 thin omitted)
- Extraction: 97% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e91a5a01`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useT
- users.ts
- WS-SUPV-2026_1e28b2d4.md
- Cawangan branch list (Kod Cawangan / Nama kedai)
- xlsx_to_import_marks.py
- useTugasan.ts
- expo
- sessionGuard.ts
- data/returns.ts
- Checklist Mingguan data model (ERD)
- dependencies
- 20260918040000_report_views.sql
- rls.test.mjs
- users
- marks
- pulangan-recon.tsx
- 20260909010000_init.sql
- marks-app/package.json
- Reporting web app (reports-web, GM/HR)
- KP-STAFF-2026_89c12a68.md
- users table
- checklist_forms table
- 20260918020000_payroll_number_changes.sql
- manager/index.tsx
- useQueue.ts
- ReturnPhotos.tsx
- useUsers.ts
- labels.ts
- App Icon (1024px master)
- Checklist Mingguan — database reference
- marks.ts
- useReturns.ts
- user-new.tsx
- appUpdates.ts
- asset_issues
- 20260909020100_return_kpi.sql
- supabase/xlsx_to_import_marks.py (converter)
- Kod Cawangan (three-letter branch code)
- install.ts
- assets.tsx
- stageKpi.ts
- xlsx-export/index.ts
- manifest.json
- marks table
- app/index.tsx
- return_events table
- 20260910020000_return_photos.sql
- scripts
- tsconfig.json
- vercel.json
- Phone app updates (EAS Update)
- mark_coverage view
- devDependencies
- app/_layout.tsx
- useMarks.ts
- return_photos_due_for_purge
- hydrate.ts
- supabase.ts
- useBranches.ts
- LanguageToggle.tsx
- resolve-alias.mjs
- import_marks.sql
- data/assets.ts
- mark_queries
- branches
- graphify knowledge graph (project rules)
- nativewind-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `useT()` - 102 edges
2. `useUsers` - 79 edges
3. `useSession` - 66 edges
4. `Screen()` - 63 edges
5. `Card()` - 58 edges
6. `react-native` - 57 edges
7. `MonoLabel()` - 54 edges
8. `useLocale` - 54 edges
9. `currentUser()` - 52 edges
10. `useMarks` - 49 edges

## Surprising Connections (you probably didn't know these)
- `report_* views data contract` --semantically_similar_to--> `Generated pct column (never stored as input)`  [INFERRED] [semantically similar]
  docs/reports-web-brief.md → db/ERD.md
- `return_ageing view` --conceptually_related_to--> `Ageing is derived, never stored`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md
- `return_submission / return_submission_kpi views` --references--> `return_events table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md
- `Totals summed from perkara, not JUMLAH cell` --conceptually_related_to--> `Generated pct column (never stored as input)`  [INFERRED]
  docs/marks-import-2026.md → db/ERD.md
- `Read Expo v57 versioned docs before coding` --rationale_for--> `Phone app (marks-app, Expo)`  [INFERRED]
  marks-app/AGENTS.md → docs/reports-web-brief.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Workbook-to-database marks import pipeline** — docs_marks_import_2026_staff_workbooks, docs_marks_import_2026_supv_workbooks, docs_marks_import_2026_xlsx_to_import_marks, docs_marks_import_2026_scorer_ids_mapping, docs_marks_import_2026_check_file, docs_marks_import_2026_import_marks_sql, docs_marks_import_2026_keep_mode [EXTRACTED 1.00]
- **report_* views data contract for GM/HR reports** — docs_reports_web_brief_report_views_data_contract, docs_reports_web_brief_report_marks, docs_reports_web_brief_report_branch_weekly, docs_reports_web_brief_report_branch_monthly, docs_reports_web_brief_report_company_monthly, docs_reports_web_brief_report_staff_monthly, docs_reports_web_brief_pct_sum_reaggregation, docs_reports_web_brief_due_definition [EXTRACTED 1.00]
- **RLS branch scoping mechanism** — db_erd_rls_branch_scoping, db_erd_security_definer_helpers, db_erd_app_can_see_branch, db_erd_security_invoker_views, db_erd_rls_test_suite, db_erd_permissive_rls_fails_silently [INFERRED 0.85]

## Communities (87 total, 28 thin omitted)

### Community 0 - "useT"
Cohesion: 0.11
Nodes (91): Cawangan(), Stat(), AdminUsers(), Filter, FILTERS, AdminLayout(), Peranan(), Akaun() (+83 more)

### Community 1 - "users.ts"
Cohesion: 0.15
Nodes (29): UserDetail(), APP_ROLES, branchChangeBlocker(), CROSS_BRANCH_ROLES, deactivateBlocker(), demotionsFor(), emailBlocker(), guard() (+21 more)

### Community 2 - "WS-SUPV-2026_1e28b2d4.md"
Cohesion: 0.40
Nodes (4): Sheet: CHECKLIST SV, Sheet: TUGASAN AREA MANAGER, Sheet: WS0001_NUR SYAHIRAH, Sheet: WS0012_WAN NURUL NABILAH HAIZUM

### Community 3 - "Cawangan branch list (Kod Cawangan / Nama kedai)"
Cohesion: 0.07
Nodes (50): AKK - Kuala Kangsar, APR - Pantai Remis, ASP - Sungai Siput, ASU - Sungai Sumun, BBT - Banting, BKP - Kapar, BLB - Kg. Lombong, BPC - Puchong (+42 more)

### Community 4 - "xlsx_to_import_marks.py"
Cohesion: 0.07
Nodes (20): as_date(), bare_number(), catatan_scores(), comment(), find_people_and_blocks(), line_up(), main(), name_like() (+12 more)

### Community 5 - "useTugasan.ts"
Cohesion: 0.12
Nodes (34): SignOffRow(), PERIODS, pad(), TUGASAN_ITEMS, TUGASAN_SEED_ENTRIES, TUGASAN_SEED_MONTH_IDX, TUGASAN_SEED_SCOPE, TUGASAN_SEED_SIGNOFF (+26 more)

### Community 6 - "expo"
Cohesion: 0.05
Nodes (40): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+32 more)

### Community 7 - "sessionGuard.ts"
Cohesion: 0.21
Nodes (15): sawActivity(), IDLE_LIMIT_MS, MAX_SESSION_MS, mergeStamps(), sessionEnd, SessionStamps, checkSession(), clearSession() (+7 more)

### Community 8 - "data/returns.ts"
Cohesion: 0.16
Nodes (31): ReturnDetail(), PulanganAktif(), BAND_BG, BAND_COLOR, ReturnRow(), AGE_LIMIT_DAYS, ageBand(), AGEING_LABEL (+23 more)

### Community 9 - "Checklist Mingguan data model (ERD)"
Cohesion: 0.24
Nodes (10): assets table, branches table, Checklist Mingguan data model (ERD), scoring_rules table, Seed provenance (REAL vs NEW rows), tugasan_checks table, tugasan_items table, tugasan_signoffs table (+2 more)

### Community 10 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-file-system, expo-font, @expo-google-fonts/ibm-plex-mono, @expo-google-fonts/public-sans (+22 more)

### Community 11 - "20260918040000_report_views.sql"
Cohesion: 0.13
Nodes (17): report_branch_monthly view, report_branch_weekly view, report_company_monthly view, report_company_weekly view, report_periods view, report_returns_branch_monthly view, report_returns_open view, report_staff_monthly view (+9 more)

### Community 12 - "rls.test.mjs"
Cohesion: 0.08
Nodes (20): description, devDependencies, @electric-sql/pglite, name, private, scripts, test:rls, verify:policies (+12 more)

### Community 13 - "users"
Cohesion: 0.07
Nodes (22): users, app_branch_id(), app_can_see_store_ops(), app_is_admin(), app_is_cross_branch(), app_is_exec(), app_role(), app_user_id() (+14 more)

### Community 14 - "marks"
Cohesion: 0.15
Nodes (23): checklist_forms, mark_coverage, mark_verifications, marks, marks_branch_period_idx, marks_user_idx, scoring_rules, report_branch_weekly (+15 more)

### Community 15 - "pulangan-recon.tsx"
Cohesion: 0.11
Nodes (36): RFC-4180, Chip(), Clash(), Note(), PulanganRecon(), Section(), Stat(), ALIASES (+28 more)

### Community 16 - "20260909010000_init.sql"
Cohesion: 0.13
Nodes (22): PGlite (Postgres engine for tests), supabase/tests/rls.test.mjs (npm run test:rls), checklist_categories, checklist_lines, mark_lines, return_events, return_events_return_idx, return_stage_gaps (+14 more)

### Community 17 - "marks-app/package.json"
Cohesion: 0.08
Nodes (23): config, { getDefaultConfig }, { withNativeWind }, main, name, private, version, babel-preset-expo (+15 more)

### Community 18 - "Reporting web app (reports-web, GM/HR)"
Cohesion: 0.11
Nodes (14): app_can_see_branch(text), Phone app role-gated sections, Phone app (marks-app, Expo), Reporting web app (reports-web, GM/HR), Supabase back end (Postgres RLS, Auth, Edge Functions), user_branches table (Area Manager extra outlets), user_role enum (nine roles), Workbook week (week_no 1-4, not ISO) (+6 more)

### Community 19 - "KP-STAFF-2026_89c12a68.md"
Cohesion: 0.18
Nodes (10): Sheet: CHECKLIST KEDAI, Sheet: CHECKLIST STAFF, Sheet: KP0093_SYAZANA IZZAH ZAFIRAH, Sheet: KP0103_PUTRI WAHIDA AMALIN, Sheet: KP0108_NOR ASYIKIN, Sheet: KP0110_FILZAH DIYANA, Sheet: KP0111_PUTERI NUR HAFIZA, Sheet: MY0544_U TIN TUN (+2 more)

### Community 20 - "users table"
Cohesion: 0.22
Nodes (11): branch_changes table, role_changes table, useBranches Zustand store, users table, useSession Zustand store (auth, not persisted), useUsers Zustand store, Zustand store to table mapping, payroll-auth Edge Function (+3 more)

### Community 21 - "checklist_forms table"
Cohesion: 0.32
Nodes (7): checklist_categories table, checklist_forms table, checklist_lines table, kedai form (22 perkara, staff), 2026 marks history import (Jan-Sep), sv form (19 perkara, SV/AS), stor form (17 perkara, store)

### Community 22 - "20260918020000_payroll_number_changes.sql"
Cohesion: 0.50
Nodes (3): payroll_id_changes, payroll_id_changes_user_idx, users_sync_auth_email

### Community 23 - "manager/index.tsx"
Cohesion: 0.14
Nodes (29): ManagerHome(), PeriodPicker(), StepButton(), currentWeekIdx(), FORM, MONTHS, STOR_FORM, SV_FORM (+21 more)

### Community 24 - "useQueue.ts"
Cohesion: 0.24
Nodes (18): dismissRejection(), drainOrder(), emptyQueue, enqueue(), isRetryable(), noteAttempt(), QueuedMark, QueueState (+10 more)

### Community 25 - "ReturnPhotos.tsx"
Cohesion: 0.20
Nodes (17): ReturnPhotos(), compress(), deleteReturnPhoto(), fetchReturnPhotos(), MAX_PER_RETURN, MAX_WIDTH, pathFor(), PickedPhoto (+9 more)

### Community 26 - "useUsers.ts"
Cohesion: 0.14
Nodes (29): Role, SupervisorTitle, User, asResult(), createBranch(), createUser(), CreateUserResult, emptyPerkara() (+21 more)

### Community 27 - "labels.ts"
Cohesion: 0.12
Nodes (15): FORM_LABEL, DISPOSITION_LABEL, REASON_LABEL, STAGE_LABEL, ROLE_BLURB, ROLE_LABEL, SUPERVISOR_TITLE_LABEL, DISPOSITION_EN (+7 more)

### Community 28 - "App Icon (1024px master)"
Cohesion: 0.12
Nodes (18): Android Adaptive Icon Background, Blueprint Construction Guides (concentric circles, dashed triangle, baseline), Stock Expo Template Icon Artwork (not custom app branding), Android Adaptive Icon Foreground, Glossy Blue Chevron / Caret Mark, Android Monochrome (Themed) Icon, Flat Grey Chevron Silhouette, Web Favicon (+10 more)

### Community 29 - "Checklist Mingguan — database reference"
Cohesion: 0.07
Nodes (27): 10. Scheduled jobs, 11. Admin scripts, 12. Migration history, 1. The server, 2. Sign-in and accounts (Auth), 3. Who may do what, 4. Tables, 5. Views (+19 more)

### Community 30 - "marks.ts"
Cohesion: 0.14
Nodes (18): FormKey, monthShort(), Period, samePeriod(), ExportResult, fetchLineIndex(), fetchMarkScores(), fetchMyWeeks() (+10 more)

### Community 31 - "useReturns.ts"
Cohesion: 0.23
Nodes (15): Disposition, nextReturnId(), ReturnReason, SEED_RETURNS, createReturn(), NewReturn, ReturnIds, ReturnRow (+7 more)

### Community 32 - "user-new.tsx"
Cohesion: 0.18
Nodes (14): NewUser(), canSetSupervisorTitle(), hiringScope, isAdministrator(), isCentralStore(), isCrossBranch(), marksRoles(), newUserBlocker() (+6 more)

### Community 33 - "appUpdates.ts"
Cohesion: 0.30
Nodes (9): RECHECK_AFTER_MS, shouldRecheck(), updateStep, checkAndFetch(), restartIntoUpdate(), updatesActive, useAppUpdates(), T0 (+1 more)

### Community 34 - "asset_issues"
Cohesion: 0.60
Nodes (5): asset_issues, asset_issues_open, asset_issues_refresh_summary(), asset_issues_stamp_resolver(), assets_refresh_summary()

### Community 35 - "20260909020100_return_kpi.sql"
Cohesion: 0.18
Nodes (5): return_ageing, return_submission, return_submission_kpi, report_returns_branch_monthly, report_returns_branch_monthly

### Community 36 - "supabase/xlsx_to_import_marks.py (converter)"
Cohesion: 0.20
Nodes (7): Workbook #DIV/0! problem, _check.sql pre-flight file, Reconciliation with workbook JUMLAH MARKAH, Scorer list / scorer_ids.xlsx mapping, *-STAFF-2026.xlsx outlet workbooks, *-SUPV-2026.xlsx outlet workbooks, supabase/xlsx_to_import_marks.py (converter)

### Community 38 - "install.ts"
Cohesion: 0.25
Nodes (13): InstallCard(), BeforeInstallPromptEvent, installState, isInAppBrowser(), isIos(), isStandalone(), listeners, notify() (+5 more)

### Community 39 - "assets.tsx"
Cohesion: 0.25
Nodes (15): AssetItem(), Assets(), failureDetail(), branchesOf(), canSeeBranch(), AssetIssue, AssetRow, fetchAssets() (+7 more)

### Community 40 - "stageKpi.ts"
Cohesion: 0.24
Nodes (9): ReturnRecord, Stage, StageOwner, chain(), days(), nextStage(), STAGE_OWNERS, StageHop (+1 more)

### Community 41 - "xlsx-export/index.ts"
Cohesion: 0.17
Nodes (4): CORS_HEADERS, CORS_HEADERS, MONTH_NAMES, ROLE_LABEL

### Community 42 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, display, icons, lang, name, orientation, scope, short_name (+2 more)

### Community 43 - "marks table"
Cohesion: 0.17
Nodes (9): mark_lines table, mark_verifications table, marks table, useMarks Zustand store, supabase/import_marks.sql (importer), NULL scored_by (no scorer recorded), final_pct (adjusted total when present), Pass threshold (scoring_rules.pass_threshold) (+1 more)

### Community 44 - "app/index.tsx"
Cohesion: 0.22
Nodes (14): BRANCH_ROLES, HQ_ROLES, RolePicker(), STORE_ROLES, LanguageToggle(), SignInForm(), isHq(), ME_ID (+6 more)

### Community 45 - "return_events table"
Cohesion: 0.36
Nodes (6): return_events table, return_stage_gaps view, return_turnaround view, returns table, suppliers table, useReturns Zustand store

### Community 46 - "20260910020000_return_photos.sql"
Cohesion: 0.39
Nodes (5): return_photos, return_photos_cap(), return_photos_cap_check, return_photos_drop_file, return_photos_return_idx

### Community 47 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, start, test, typecheck, web

### Community 48 - "tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, expo/tsconfig.base

### Community 49 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, cleanUrls, devCommand, framework, outputDirectory, rewrites

### Community 50 - "Phone app updates (EAS Update)"
Cohesion: 0.29
Nodes (6): Cost, Every change after that: publish an update, Once: the last APK installed by hand, Phone app updates (EAS Update), What a phone does with it, When a new APK is still needed

### Community 51 - "mark_coverage view"
Cohesion: 0.40
Nodes (3): mark_coverage view, Coverage / unmarked weeks KPI, Verification rate KPI

### Community 52 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, babel-preset-expo, tailwindcss, @types/react, typescript

### Community 53 - "app/_layout.tsx"
Cohesion: 0.16
Nodes (15): endSession(), nameOf(), PUBLIC_ROUTES, RootLayout(), UpdateBanner(), HOME_ROUTE, mayOpen(), SECTION_OWNERS (+7 more)

### Community 54 - "useMarks.ts"
Cohesion: 0.17
Nodes (13): FORMS, Kategori, Answer, scoredOnly(), Totals, totalsOf(), verifyMark(), Draft (+5 more)

### Community 56 - "hydrate.ts"
Cohesion: 0.21
Nodes (13): todayShort(), fetchRoleChanges(), hydrateDirectory(), notePeriod(), fetchMyReminders(), markReminderRead(), Reminder, sendReminder() (+5 more)

### Community 57 - "supabase.ts"
Cohesion: 0.18
Nodes (13): AUTH_EMAIL_DOMAIN, emailForPayroll(), establishSession(), fetchSignedInStaff(), SignedInStaff, SignInResult, signInWithPayroll(), signOutOfSupabase() (+5 more)

### Community 58 - "useBranches.ts"
Cohesion: 0.22
Nodes (11): Branch, branchLabel(), closeBranchBlocker(), defaultShort(), findBranch(), HQ_BRANCH_ID, newBranchBlocker(), SEED_BRANCHES (+3 more)

### Community 59 - "LanguageToggle.tsx"
Cohesion: 0.40
Nodes (4): Locale, STRINGS, translate(), endedMessage()

### Community 64 - "branches"
Cohesion: 0.20
Nodes (10): assets, branch_changes, branches, tugasan_checks, tugasan_items, tugasan_signoffs, reminders, reminders_recipient_idx (+2 more)

## Ambiguous Edges - Review These
- `QPJ - Miri` → `Branch group Q* (Sarawak)`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `VBC - Batu Caves` → `Branch group V* (Kuala Lumpur area)`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `App Icon (1024px master)` → `Splash Screen Icon`  [AMBIGUOUS]
  marks-app/assets/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **297 isolated node(s):** `name`, `slug`, `version`, `policy`, `url` (+292 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 412 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `QPJ - Miri` and `Branch group Q* (Sarawak)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `VBC - Batu Caves` and `Branch group V* (Kuala Lumpur area)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `App Icon (1024px master)` and `Splash Screen Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `dependencies` to `marks-app/package.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `react-native` connect `useT` to `user-new.tsx`, `users.ts`, `appUpdates.ts`, `install.ts`, `assets.tsx`, `data/returns.ts`, `sessionGuard.ts`, `app/index.tsx`, `pulangan-recon.tsx`, `marks-app/package.json`, `app/_layout.tsx`, `manager/index.tsx`, `ReturnPhotos.tsx`, `LanguageToggle.tsx`, `supabase.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `zustand` connect `useBranches.ts` to `useT`, `useUsers.ts`, `useTugasan.ts`, `assets.tsx`, `marks-app/package.json`, `useMarks.ts`, `useQueue.ts`, `hydrate.ts`, `useReturns.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _297 weakly-connected nodes found - possible documentation gaps or missing edges._