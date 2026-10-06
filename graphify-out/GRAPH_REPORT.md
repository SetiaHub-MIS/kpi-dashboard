# Graph Report - Performance marking app dashboard  (2026-10-06)

## Corpus Check
- 199 files · ~325,675 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1321 nodes · 4252 edges · 80 communities (49 shown, 31 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `32c49c47`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useT
- useUsers.ts
- WS-SUPV-2026_1e28b2d4.md
- Cawangan branch list (Kod Cawangan / Nama kedai)
- xlsx_to_import_marks.py
- useTugasan.ts
- expo
- sessionGuard.ts
- useSession.ts
- Checklist Mingguan data model (ERD)
- dependencies
- report_* views data contract
- rls.test.mjs
- users
- 20260918040000_report_views.sql
- reconcile.ts
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
- tabOptions.tsx
- labels.ts
- App Icon (1024px master)
- Checklist Mingguan — database reference
- pulangan-recon.tsx
- useReturns.ts
- 20260918010000_auto_provision_logins.sql
- appUpdates.ts
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
- mark_verifications
- return_events table
- 20260910020000_return_photos.sql
- scripts
- tsconfig.json
- vercel.json
- Phone app updates (EAS Update)
- devDependencies
- app/_layout.tsx
- return_photos_due_for_purge
- resolve-alias.mjs
- import_marks.sql
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
- `3. Who may do what` --references--> `store()`  [INFERRED]
  docs/database.md → marks-app/tests/tugasanAutosave.test.mjs
- `report_* views data contract` --semantically_similar_to--> `Generated pct column (never stored as input)`  [INFERRED] [semantically similar]
  docs/reports-web-brief.md → db/ERD.md
- `Totals summed from perkara, not JUMLAH cell` --conceptually_related_to--> `Generated pct column (never stored as input)`  [INFERRED]
  docs/marks-import-2026.md → db/ERD.md
- `Read Expo v57 versioned docs before coding` --rationale_for--> `Phone app (marks-app, Expo)`  [INFERRED]
  marks-app/AGENTS.md → docs/reports-web-brief.md
- `reminders table` --references--> `users table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Workbook-to-database marks import pipeline** — docs_marks_import_2026_staff_workbooks, docs_marks_import_2026_supv_workbooks, docs_marks_import_2026_xlsx_to_import_marks, docs_marks_import_2026_scorer_ids_mapping, docs_marks_import_2026_check_file, docs_marks_import_2026_import_marks_sql, docs_marks_import_2026_keep_mode [EXTRACTED 1.00]
- **report_* views data contract for GM/HR reports** — docs_reports_web_brief_report_views_data_contract, docs_reports_web_brief_report_marks, docs_reports_web_brief_report_branch_weekly, docs_reports_web_brief_report_branch_monthly, docs_reports_web_brief_report_company_monthly, docs_reports_web_brief_report_staff_monthly, docs_reports_web_brief_pct_sum_reaggregation, docs_reports_web_brief_due_definition [EXTRACTED 1.00]
- **RLS branch scoping mechanism** — db_erd_rls_branch_scoping, db_erd_security_definer_helpers, db_erd_app_can_see_branch, db_erd_security_invoker_views, db_erd_rls_test_suite, db_erd_permissive_rls_fails_silently [INFERRED 0.85]

## Communities (80 total, 31 thin omitted)

### Community 0 - "useT"
Cohesion: 0.09
Nodes (103): Cawangan(), Stat(), AdminUsers(), Filter, FILTERS, Peranan(), Akaun(), ReturnDetail() (+95 more)

### Community 1 - "useUsers.ts"
Cohesion: 0.05
Nodes (95): BRANCH_ROLES, HQ_ROLES, RolePicker(), STORE_ROLES, UserDetail(), NewUser(), LanguageToggle(), SignInForm() (+87 more)

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
Cohesion: 0.05
Nodes (57): SignOffRow(), pad(), chain(), days(), nextStage(), STAGE_OWNERS, StageHop, stageKpi (+49 more)

### Community 6 - "expo"
Cohesion: 0.05
Nodes (40): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+32 more)

### Community 7 - "sessionGuard.ts"
Cohesion: 0.17
Nodes (17): sawActivity(), IDLE_LIMIT_MS, MAX_SESSION_MS, mergeStamps(), sessionEnd, SessionStamps, STRINGS, translate() (+9 more)

### Community 8 - "useSession.ts"
Cohesion: 0.21
Nodes (14): AUTH_EMAIL_DOMAIN, emailForPayroll(), establishSession(), fetchSignedInStaff(), SignedInStaff, SignInResult, signInWithPayroll(), signOutOfSupabase() (+6 more)

### Community 9 - "Checklist Mingguan data model (ERD)"
Cohesion: 0.17
Nodes (16): assets table, branches table, Checklist Mingguan data model (ERD), returns table, scoring_rules table, Seed provenance (REAL vs NEW rows), suppliers table, tugasan_checks table (+8 more)

### Community 10 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-file-system, expo-font, @expo-google-fonts/ibm-plex-mono, @expo-google-fonts/public-sans (+22 more)

### Community 11 - "report_* views data contract"
Cohesion: 0.20
Nodes (9): Coverage / unmarked weeks KPI, report_branch_monthly view, report_branch_weekly view, report_company_monthly view, report_company_weekly view, report_periods view, report_staff_monthly view, v1 report list (Dashboard, Outlets, Staff, Pulangan) (+1 more)

### Community 12 - "rls.test.mjs"
Cohesion: 0.08
Nodes (20): description, devDependencies, @electric-sql/pglite, name, private, scripts, test:rls, verify:policies (+12 more)

### Community 13 - "users"
Cohesion: 0.08
Nodes (23): mark_coverage, user_branches_area_manager_only(), users, users_branch_role_idx, app_branch_id(), app_can_see_store_ops(), app_is_admin(), app_is_cross_branch() (+15 more)

### Community 14 - "20260918040000_report_views.sql"
Cohesion: 0.16
Nodes (21): checklist_forms, marks, scoring_rules, report_branch_monthly, report_branch_weekly, report_company_monthly, report_company_weekly, report_due (+13 more)

### Community 15 - "reconcile.ts"
Cohesion: 0.13
Nodes (21): RFC-4180, ALIASES, EMPTY_MAPPING, FieldClash, looseEq(), Mapping, Match, normaliseBill() (+13 more)

### Community 16 - "20260909010000_init.sql"
Cohesion: 0.13
Nodes (22): PGlite (Postgres engine for tests), supabase/tests/rls.test.mjs (npm run test:rls), checklist_categories, checklist_lines, mark_lines, marks_branch_period_idx, marks_user_idx, return_events (+14 more)

### Community 17 - "marks-app/package.json"
Cohesion: 0.08
Nodes (23): config, { getDefaultConfig }, { withNativeWind }, main, name, private, version, babel-preset-expo (+15 more)

### Community 18 - "Reporting web app (reports-web, GM/HR)"
Cohesion: 0.12
Nodes (12): app_can_see_branch(text), Phone app role-gated sections, Phone app (marks-app, Expo), Reporting web app (reports-web, GM/HR), Supabase back end (Postgres RLS, Auth, Edge Functions), user_branches table (Area Manager extra outlets), user_role enum (nine roles), marks-app CLAUDE.md includes AGENTS.md (+4 more)

### Community 19 - "KP-STAFF-2026_89c12a68.md"
Cohesion: 0.18
Nodes (10): Sheet: CHECKLIST KEDAI, Sheet: CHECKLIST STAFF, Sheet: KP0093_SYAZANA IZZAH ZAFIRAH, Sheet: KP0103_PUTRI WAHIDA AMALIN, Sheet: KP0108_NOR ASYIKIN, Sheet: KP0110_FILZAH DIYANA, Sheet: KP0111_PUTERI NUR HAFIZA, Sheet: MY0544_U TIN TUN (+2 more)

### Community 20 - "users table"
Cohesion: 0.32
Nodes (8): branch_changes table, role_changes table, users table, useUsers Zustand store, payroll-auth Edge Function, payroll_id_changes table, Payroll number identity (users.id), reminders table

### Community 21 - "checklist_forms table"
Cohesion: 0.38
Nodes (6): checklist_categories table, checklist_forms table, kedai form (22 perkara, staff), 2026 marks history import (Jan-Sep), sv form (19 perkara, SV/AS), stor form (17 perkara, store)

### Community 22 - "20260918020000_payroll_number_changes.sql"
Cohesion: 0.50
Nodes (3): payroll_id_changes, payroll_id_changes_user_idx, users_sync_auth_email

### Community 23 - "manager/index.tsx"
Cohesion: 0.05
Nodes (104): Done(), AssetItem(), Assets(), failureDetail(), ManagerHome(), ManagerSvQueue(), StaffRekod(), SupervisorQueue() (+96 more)

### Community 24 - "useQueue.ts"
Cohesion: 0.24
Nodes (18): dismissRejection(), drainOrder(), emptyQueue, enqueue(), isRetryable(), noteAttempt(), QueuedMark, QueueState (+10 more)

### Community 25 - "ReturnPhotos.tsx"
Cohesion: 0.20
Nodes (17): ReturnPhotos(), compress(), deleteReturnPhoto(), fetchReturnPhotos(), MAX_PER_RETURN, MAX_WIDTH, pathFor(), PickedPhoto (+9 more)

### Community 26 - "tabOptions.tsx"
Cohesion: 0.23
Nodes (11): AdminLayout(), ManagerLayout(), PulanganLayout(), StaffLayout(), SupervisorLayout(), BaseOf, baseTabOptions, OutlineName (+3 more)

### Community 27 - "labels.ts"
Cohesion: 0.11
Nodes (18): FORM_LABEL, FIELD_LABEL, VendorField, DISPOSITION_LABEL, REASON_LABEL, STAGE_LABEL, ROLE_BLURB, ROLE_LABEL (+10 more)

### Community 28 - "App Icon (1024px master)"
Cohesion: 0.12
Nodes (18): Android Adaptive Icon Background, Blueprint Construction Guides (concentric circles, dashed triangle, baseline), Stock Expo Template Icon Artwork (not custom app branding), Android Adaptive Icon Foreground, Glossy Blue Chevron / Caret Mark, Android Monochrome (Themed) Icon, Flat Grey Chevron Silhouette, Web Favicon (+10 more)

### Community 29 - "Checklist Mingguan — database reference"
Cohesion: 0.07
Nodes (28): 10. Scheduled jobs, 11. Admin scripts, 12. Migration history, 1. The server, 2. Sign-in and accounts (Auth), 3. Who may do what, 4. Tables, 5. Views (+20 more)

### Community 30 - "pulangan-recon.tsx"
Cohesion: 0.27
Nodes (13): Chip(), Clash(), Note(), PulanganRecon(), Section(), Stat(), canReconcile(), guessMapping() (+5 more)

### Community 31 - "useReturns.ts"
Cohesion: 0.18
Nodes (19): Disposition, nextReturnId(), ReturnReason, ReturnRecord, SEED_RETURNS, Stage, createReturn(), fetchReturns() (+11 more)

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
Cohesion: 0.17
Nodes (8): mark_coverage view, Workbook #DIV/0! problem, _check.sql pre-flight file, Reconciliation with workbook JUMLAH MARKAH, Scorer list / scorer_ids.xlsx mapping, *-STAFF-2026.xlsx outlet workbooks, *-SUPV-2026.xlsx outlet workbooks, supabase/xlsx_to_import_marks.py (converter)

### Community 38 - "install.ts"
Cohesion: 0.25
Nodes (13): InstallCard(), BeforeInstallPromptEvent, installState, isInAppBrowser(), isIos(), isStandalone(), listeners, notify() (+5 more)

### Community 41 - "xlsx-export/index.ts"
Cohesion: 0.17
Nodes (4): CORS_HEADERS, CORS_HEADERS, MONTH_NAMES, ROLE_LABEL

### Community 42 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, display, icons, lang, name, orientation, scope, short_name (+2 more)

### Community 43 - "marks table"
Cohesion: 0.16
Nodes (10): checklist_lines table, mark_lines table, mark_verifications table, marks table, useMarks Zustand store, supabase/import_marks.sql (importer), NULL scored_by (no scorer recorded), final_pct (adjusted total when present) (+2 more)

### Community 45 - "return_events table"
Cohesion: 0.19
Nodes (11): return_events table, return_stage_gaps view, return_turnaround view, report_returns_branch_monthly view, report_returns_open view, report_today() (Malaysia date), return_ageing view, return_submission / return_submission_kpi views (+3 more)

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

### Community 53 - "app/_layout.tsx"
Cohesion: 0.17
Nodes (14): endSession(), nameOf(), PUBLIC_ROUTES, RootLayout(), UpdateBanner(), takeCarriedNotice(), signOutAndClear(), arrivedWithResetLink (+6 more)

### Community 64 - "branches"
Cohesion: 0.18
Nodes (11): assets, branch_changes, branches, tugasan_checks, tugasan_items, tugasan_signoffs, reminders, reminders_recipient_idx (+3 more)

## Ambiguous Edges - Review These
- `QPJ - Miri` → `Branch group Q* (Sarawak)`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `VBC - Batu Caves` → `Branch group V* (Kuala Lumpur area)`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `App Icon (1024px master)` → `Splash Screen Icon`  [AMBIGUOUS]
  marks-app/assets/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **307 isolated node(s):** `name`, `slug`, `version`, `policy`, `url` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 426 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `QPJ - Miri` and `Branch group Q* (Sarawak)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `VBC - Batu Caves` and `Branch group V* (Kuala Lumpur area)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `App Icon (1024px master)` and `Splash Screen Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `store()` connect `Checklist Mingguan — database reference` to `useTugasan.ts`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _307 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useT` be split into smaller, more focused modules?**
  _Cohesion score 0.0916970353590072 - nodes in this community are weakly interconnected._
- **Should `useUsers.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05317703024125042 - nodes in this community are weakly interconnected._