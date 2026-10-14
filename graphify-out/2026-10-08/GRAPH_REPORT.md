# Graph Report - Performance marking app dashboard  (2026-10-08)

## Corpus Check
- 217 files · ~332,770 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1404 nodes · 4521 edges · 91 communities (57 shown, 34 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e4dfc0a4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useT
- Checklist Mingguan data model (ERD)
- WS-SUPV-2026_1e28b2d4.md
- Cawangan branch list (Kod Cawangan / Nama kedai)
- xlsx_to_import_marks.py
- useTugasan.ts
- expo
- app/_layout.tsx
- useUsers.ts
- users table
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
- hydrate.ts
- checklist_forms table
- 20260918020000_payroll_number_changes.sql
- useQueue.ts
- tugasanRows.ts
- ReturnPhotos.tsx
- stub-lib-tugasan.ts
- labels.ts
- App Icon (1024px master)
- Checklist Mingguan — database reference
- data/returns.ts
- useReturns.ts
- tugasanAutosave.test.mjs
- MarksOutletPicker.tsx
- asset_issues
- 20260909020100_return_kpi.sql
- supabase/xlsx_to_import_marks.py (converter)
- Kod Cawangan (three-letter branch code)
- install.ts
- stub-resolve.mjs
- stub-supabase.ts
- xlsx-export/index.ts
- manifest.json
- marks table
- mark_coverage view
- return_events table
- 20260910020000_return_photos.sql
- scripts
- tsconfig.json
- vercel.json
- Phone app updates (EAS Update)
- diagnose_load.sql
- devDependencies
- manager/index.tsx
- return_photos_due_for_purge
- lib/assets.ts
- users.ts
- app.json
- resolve-alias.mjs
- import_marks.sql
- appUpdates.ts
- mark_queries
- branches
- graphify knowledge graph (project rules)
- nativewind-env.d.ts
- useSession.ts
- stub-auth-resolve.mjs
- stub-users-types.ts
- ActivityBar.tsx
- ref_node_assert

## God Nodes (most connected - your core abstractions)
1. `useT()` - 109 edges
2. `useUsers` - 79 edges
3. `useSession` - 66 edges
4. `Screen()` - 64 edges
5. `Card()` - 62 edges
6. `react-native` - 60 edges
7. `MonoLabel()` - 54 edges
8. `useLocale` - 54 edges
9. `useMarks` - 52 edges
10. `currentUser()` - 52 edges

## Surprising Connections (you probably didn't know these)
- `3. Who may do what` --references--> `store()`  [INFERRED]
  docs/database.md → marks-app/tests/tugasanAutosave.test.mjs
- `report_* views data contract` --semantically_similar_to--> `Generated pct column (never stored as input)`  [INFERRED] [semantically similar]
  docs/reports-web-brief.md → db/ERD.md
- `Totals summed from perkara, not JUMLAH cell` --conceptually_related_to--> `Generated pct column (never stored as input)`  [INFERRED]
  docs/marks-import-2026.md → db/ERD.md
- `Read Expo v57 versioned docs before coding` --rationale_for--> `Phone app (marks-app, Expo)`  [INFERRED]
  marks-app/AGENTS.md → docs/reports-web-brief.md
- `stor form (17 perkara, store)` --references--> `checklist_forms table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Workbook-to-database marks import pipeline** — docs_marks_import_2026_staff_workbooks, docs_marks_import_2026_supv_workbooks, docs_marks_import_2026_xlsx_to_import_marks, docs_marks_import_2026_scorer_ids_mapping, docs_marks_import_2026_check_file, docs_marks_import_2026_import_marks_sql, docs_marks_import_2026_keep_mode [EXTRACTED 1.00]
- **report_* views data contract for GM/HR reports** — docs_reports_web_brief_report_views_data_contract, docs_reports_web_brief_report_marks, docs_reports_web_brief_report_branch_weekly, docs_reports_web_brief_report_branch_monthly, docs_reports_web_brief_report_company_monthly, docs_reports_web_brief_report_staff_monthly, docs_reports_web_brief_pct_sum_reaggregation, docs_reports_web_brief_due_definition [EXTRACTED 1.00]
- **RLS branch scoping mechanism** — db_erd_rls_branch_scoping, db_erd_security_definer_helpers, db_erd_app_can_see_branch, db_erd_security_invoker_views, db_erd_rls_test_suite, db_erd_permissive_rls_fails_silently [INFERRED 0.85]

## Communities (91 total, 34 thin omitted)

### Community 0 - "useT"
Cohesion: 0.07
Nodes (122): Cawangan(), Stat(), AdminUsers(), Filter, FILTERS, AdminLayout(), Peranan(), Akaun() (+114 more)

### Community 1 - "Checklist Mingguan data model (ERD)"
Cohesion: 0.24
Nodes (10): assets table, branches table, Checklist Mingguan data model (ERD), scoring_rules table, Seed provenance (REAL vs NEW rows), tugasan_checks table, tugasan_items table, tugasan_signoffs table (+2 more)

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
Cohesion: 0.11
Nodes (26): TUGASAN_ITEMS, TUGASAN_SEED_ENTRIES, TUGASAN_SEED_MONTH_IDX, TUGASAN_SEED_SCOPE, TUGASAN_SEED_SIGNOFF, TugasanItem, scopeParts(), Box (+18 more)

### Community 6 - "expo"
Cohesion: 0.05
Nodes (40): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+32 more)

### Community 7 - "app/_layout.tsx"
Cohesion: 0.11
Nodes (31): endSession(), nameOf(), PUBLIC_ROUTES, RootLayout(), sawActivity(), UpdateBanner(), mayOpen(), IDLE_LIMIT_MS (+23 more)

### Community 8 - "useUsers.ts"
Cohesion: 0.16
Nodes (25): Role, SEED_USERS, SupervisorTitle, asResult(), createBranch(), createUser(), CreateUserResult, replaceCoverage() (+17 more)

### Community 9 - "users table"
Cohesion: 0.22
Nodes (11): branch_changes table, role_changes table, useBranches Zustand store, users table, useSession Zustand store (auth, not persisted), useUsers Zustand store, Zustand store to table mapping, payroll-auth Edge Function (+3 more)

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
Cohesion: 0.07
Nodes (28): config, { getDefaultConfig }, { withNativeWind }, main, name, private, version, exportMonthXlsx() (+20 more)

### Community 18 - "Reporting web app (reports-web, GM/HR)"
Cohesion: 0.11
Nodes (14): app_can_see_branch(text), Phone app role-gated sections, Phone app (marks-app, Expo), Reporting web app (reports-web, GM/HR), Supabase back end (Postgres RLS, Auth, Edge Functions), user_branches table (Area Manager extra outlets), user_role enum (nine roles), Workbook week (week_no 1-4, not ISO) (+6 more)

### Community 19 - "KP-STAFF-2026_89c12a68.md"
Cohesion: 0.18
Nodes (10): Sheet: CHECKLIST KEDAI, Sheet: CHECKLIST STAFF, Sheet: KP0093_SYAZANA IZZAH ZAFIRAH, Sheet: KP0103_PUTRI WAHIDA AMALIN, Sheet: KP0108_NOR ASYIKIN, Sheet: KP0110_FILZAH DIYANA, Sheet: KP0111_PUTERI NUR HAFIZA, Sheet: MY0544_U TIN TUN (+2 more)

### Community 20 - "hydrate.ts"
Cohesion: 0.14
Nodes (23): errorDetail(), todayShort(), emptyPerkara(), fetchBranches(), fetchDirectory(), fetchRoleChanges(), fetchStaff(), fetchUserBranches() (+15 more)

### Community 21 - "checklist_forms table"
Cohesion: 0.32
Nodes (7): checklist_categories table, checklist_forms table, checklist_lines table, kedai form (22 perkara, staff), 2026 marks history import (Jan-Sep), sv form (19 perkara, SV/AS), stor form (17 perkara, store)

### Community 22 - "20260918020000_payroll_number_changes.sql"
Cohesion: 0.50
Nodes (3): payroll_id_changes, payroll_id_changes_user_idx, users_sync_auth_email

### Community 23 - "useQueue.ts"
Cohesion: 0.24
Nodes (18): dismissRejection(), drainOrder(), emptyQueue, enqueue(), isRetryable(), noteAttempt(), QueuedMark, QueueState (+10 more)

### Community 24 - "tugasanRows.ts"
Cohesion: 0.22
Nodes (16): tugasanKey(), tugasanScope(), isoToShort(), monthIdxOf(), snapshotFromRows(), TugasanCheckRow, TugasanCheckWrite, TugasanSignoffRow (+8 more)

### Community 25 - "ReturnPhotos.tsx"
Cohesion: 0.20
Nodes (17): ReturnPhotos(), compress(), deleteReturnPhoto(), fetchReturnPhotos(), MAX_PER_RETURN, MAX_WIDTH, pathFor(), PickedPhoto (+9 more)

### Community 26 - "stub-lib-tugasan.ts"
Cohesion: 0.16
Nodes (16): apply(), checkRow(), gate, Key, KEY_FIELDS, keyOf(), Row, signoffRow() (+8 more)

### Community 27 - "labels.ts"
Cohesion: 0.12
Nodes (15): FORM_LABEL, DISPOSITION_LABEL, REASON_LABEL, STAGE_LABEL, ROLE_BLURB, ROLE_LABEL, SUPERVISOR_TITLE_LABEL, DISPOSITION_EN (+7 more)

### Community 28 - "App Icon (1024px master)"
Cohesion: 0.12
Nodes (18): Android Adaptive Icon Background, Blueprint Construction Guides (concentric circles, dashed triangle, baseline), Stock Expo Template Icon Artwork (not custom app branding), Android Adaptive Icon Foreground, Glossy Blue Chevron / Caret Mark, Android Monochrome (Themed) Icon, Flat Grey Chevron Silhouette, Web Favicon (+10 more)

### Community 29 - "Checklist Mingguan — database reference"
Cohesion: 0.07
Nodes (28): 10. Scheduled jobs, 11. Admin scripts, 12. Migration history, 1. The server, 2. Sign-in and accounts (Auth), 3. Who may do what, 4. Tables, 5. Views (+20 more)

### Community 30 - "data/returns.ts"
Cohesion: 0.16
Nodes (31): ReturnDetail(), PulanganAktif(), BAND_BG, BAND_COLOR, ReturnRow(), AGE_LIMIT_DAYS, ageBand(), AGEING_LABEL (+23 more)

### Community 31 - "useReturns.ts"
Cohesion: 0.16
Nodes (23): avgOf(), PulanganSelesai(), RouteStat(), Disposition, gapDays(), nextReturnId(), ReturnReason, SEED_RETURNS (+15 more)

### Community 32 - "tugasanAutosave.test.mjs"
Cohesion: 0.22
Nodes (11): AUTOSAVE_MS, createUnsaved(), dateReady(), rowOfKey(), shortToIso(), at(), checks(), lastCheck() (+3 more)

### Community 33 - "MarksOutletPicker.tsx"
Cohesion: 0.36
Nodes (9): MarksOutletPicker(), useEffectiveOutlet(), useNeedsOutlet(), useOutletScoped(), defaultMarksOutlet(), marksOutletsFor(), scopesMarksByOutlet(), User (+1 more)

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
Cohesion: 0.26
Nodes (12): BeforeInstallPromptEvent, installState, isInAppBrowser(), isIos(), isStandalone(), listeners, notify(), promptInstall() (+4 more)

### Community 41 - "xlsx-export/index.ts"
Cohesion: 0.17
Nodes (4): CORS_HEADERS, CORS_HEADERS, MONTH_NAMES, ROLE_LABEL

### Community 42 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, display, icons, lang, name, orientation, scope, short_name (+2 more)

### Community 43 - "marks table"
Cohesion: 0.17
Nodes (9): mark_lines table, mark_verifications table, marks table, useMarks Zustand store, supabase/import_marks.sql (importer), NULL scored_by (no scorer recorded), final_pct (adjusted total when present), Pass threshold (scoring_rules.pass_threshold) (+1 more)

### Community 44 - "mark_coverage view"
Cohesion: 0.40
Nodes (3): mark_coverage view, Coverage / unmarked weeks KPI, Verification rate KPI

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

### Community 52 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, babel-preset-expo, tailwindcss, @types/react, typescript

### Community 53 - "manager/index.tsx"
Cohesion: 0.07
Nodes (79): Done(), ManagerSvQueue(), MarkPerson(), StaffRekod(), SupervisorQueue(), Rekod(), AssetItem(), PeriodPicker() (+71 more)

### Community 57 - "lib/assets.ts"
Cohesion: 0.22
Nodes (11): canSeeBranch(), AssetIssue, AssetRow, fetchAssets(), isAssetOpen(), reportAssetIssue(), resolveAssetIssue(), toIssue() (+3 more)

### Community 58 - "users.ts"
Cohesion: 0.13
Nodes (22): APP_ROLES, canSetSupervisorTitle(), CROSS_BRANCH_ROLES, deactivateBlocker(), demotionsFor(), guard(), isAdministrator(), isSqlOnlyRole() (+14 more)

### Community 62 - "appUpdates.ts"
Cohesion: 0.26
Nodes (12): pad(), publishedLabel(), RECHECK_AFTER_MS, runningCode, shouldRecheck(), updateStep, checkAndFetch(), restartIntoUpdate() (+4 more)

### Community 64 - "branches"
Cohesion: 0.20
Nodes (10): assets, branch_changes, branches, tugasan_checks, tugasan_items, tugasan_signoffs, reminders, reminders_recipient_idx (+2 more)

### Community 88 - "useSession.ts"
Cohesion: 0.13
Nodes (20): AUTH_EMAIL_DOMAIN, emailForPayroll(), establishSession(), fetchSignedInStaff(), INACTIVE_ACCOUNT, InactiveAccountError, SignedInStaff, SignInResult (+12 more)

### Community 97 - "ActivityBar.tsx"
Cohesion: 0.29
Nodes (10): ActivityBar(), useShown(), activityKind(), MIN_VISIBLE_MS, requestKind, SHOW_AFTER_MS, trackedFetch(), ActivityState (+2 more)

### Community 100 - "ref_node_assert"
Cohesion: 0.14
Nodes (9): chain(), days(), nextStage(), STAGE_OWNERS, StageHop, stageKpi, fake, isSupabaseConfigured (+1 more)

## Ambiguous Edges - Review These
- `QPJ - Miri` → `Branch group Q* (Sarawak)`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `VBC - Batu Caves` → `Branch group V* (Kuala Lumpur area)`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `App Icon (1024px master)` → `Splash Screen Icon`  [AMBIGUOUS]
  marks-app/assets/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **323 isolated node(s):** `expo`, `name`, `slug`, `version`, `policy` (+318 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 451 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `QPJ - Miri` and `Branch group Q* (Sarawak)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `VBC - Batu Caves` and `Branch group V* (Kuala Lumpur area)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `App Icon (1024px master)` and `Splash Screen Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `store()` connect `Checklist Mingguan — database reference` to `tugasanAutosave.test.mjs`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **What connects `expo`, `name`, `slug` to the rest of the system?**
  _323 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useT` be split into smaller, more focused modules?**
  _Cohesion score 0.07386745530313214 - nodes in this community are weakly interconnected._
- **Should `Cawangan branch list (Kod Cawangan / Nama kedai)` be split into smaller, more focused modules?**
  _Cohesion score 0.06901960784313725 - nodes in this community are weakly interconnected._