# Graph Report - Performance marking app dashboard  (2026-10-03)

## Corpus Check
- 194 files · ~311,460 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1326 nodes · 4238 edges · 87 communities (56 shown, 31 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.82)
- Token cost: 353,400 input · 0 output

## Community Hubs (Navigation)
- App Screens & Shared UI
- Users, Roles & Directory
- SV/AS Workbook (WS-SUPV)
- Branch List & Regions
- Workbook Marks Converter
- Tugasan Self-Check
- Expo App Config
- Session & Root Layout
- Returns Chain & Stages
- Data Model (ERD)
- Expo Dependencies
- Report Views Contract
- Database Test Harness
- RLS Helper Functions
- Marks & Report Views (SQL)
- CSV Reconciliation Logic
- Core Schema Tables
- Metro & NativeWind Build
- System Architecture
- Staff Checklist Form (KP-STAFF)
- Directory Hydration & Reminders
- Auth & Supabase Client
- Marking Queues
- Forms & Scoring Rules
- Offline Marks Queue
- Return Photo Evidence
- Tab Navigation
- Reconciliation Screen
- App Icons (Stock Expo)
- Dates, Periods & Assets
- Marks API (Supabase)
- Returns Store & API
- Staff Workbook Sheets & Markers
- i18n Domain Labels
- Shop Cleanliness & Assets (Workbook)
- Returns KPI (SQL)
- Marks Import Plan
- Store Asset Log (Workbook)
- PWA Install Prompt
- Marking Screen
- Store/Clerk Stage KPI
- Edge Functions
- PWA Manifest
- Verification & Report KPIs
- Returns Tables (SQL)
- Returns Data Model (ERD)
- Return Photos Migration (old)
- App npm Scripts
- TypeScript Config
- Vercel Deploy Config
- Checklist Forms & Cohorts
- Stock Arrangement Perkara
- App Dev Dependencies
- Route Access Rules
- Asset Visibility
- Photo Purge Function
- Asset Catalogue Migration
- Payroll Number Changes
- Login Auto-Provisioning
- i18n Strings
- Test Alias Resolver
- Marks Import Script
- Verified-Mark Lock
- Query Thread (dropped)
- Reminders Table
- Graphify Project Rules
- NativeWind Types

## God Nodes (most connected - your core abstractions)
1. `useT()` - 100 edges
2. `useUsers` - 79 edges
3. `useSession` - 65 edges
4. `Screen()` - 63 edges
5. `Card()` - 58 edges
6. `react-native` - 55 edges
7. `MonoLabel()` - 54 edges
8. `useLocale` - 54 edges
9. `currentUser()` - 52 edges
10. `useMarks` - 49 edges

## Surprising Connections (you probably didn't know these)
- `report_* views data contract` --semantically_similar_to--> `Generated pct column (never stored as input)`  [INFERRED] [semantically similar]
  docs/reports-web-brief.md → db/ERD.md
- `reminders table` --references--> `users table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md
- `stor form (17 perkara, store)` --references--> `checklist_forms table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md
- `return_submission / return_submission_kpi views` --references--> `return_events table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md
- `Totals summed from perkara, not JUMLAH cell` --conceptually_related_to--> `Generated pct column (never stored as input)`  [INFERRED]
  docs/marks-import-2026.md → db/ERD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Weekly score -> total -> % -> monthly average pipeline** — graphify_out_converted_kp_staff_2026_89c12a68_score_scale_na_1_5, graphify_out_converted_kp_staff_2026_89c12a68_jumlah_markah, graphify_out_converted_kp_staff_2026_89c12a68_weekly_percentage, graphify_out_converted_kp_staff_2026_89c12a68_monthly_summary_table, graphify_out_converted_kp_staff_2026_89c12a68_div0_pattern [INFERRED 0.95]
- **Two-tier SV/AS then MANAGER verification (manager tier never used)** — graphify_out_converted_kp_staff_2026_89c12a68_sv_as_column, graphify_out_converted_kp_staff_2026_89c12a68_manager_column, graphify_out_converted_kp_staff_2026_89c12a68_nama_row, graphify_out_converted_kp_staff_2026_89c12a68_diisikan_oleh, graphify_out_converted_kp_staff_2026_89c12a68_diperiksa_oleh [INFERRED 0.85]
- **Store asset issue tracking (tick, remark, resolution date)** — graphify_out_converted_kp_staff_2026_89c12a68_checklist_kedai_sheet, graphify_out_converted_kp_staff_2026_89c12a68_kedai_tick_catatan_penyelesaian, graphify_out_converted_kp_staff_2026_89c12a68_aircond_fault_issue, graphify_out_converted_kp_staff_2026_89c12a68_floor_tile_issue [INFERRED 0.85]
- **Marks entered by Area Manager only, Manager verification never filled** — graphify_out_converted_ws_supv_2026_1e28b2d4_person_herdi, graphify_out_converted_ws_supv_2026_1e28b2d4_am_column, graphify_out_converted_ws_supv_2026_1e28b2d4_manager_column, graphify_out_converted_ws_supv_2026_1e28b2d4_empty_manager_column_pattern, graphify_out_converted_ws_supv_2026_1e28b2d4_diperiksa_oleh [INFERRED 0.85]
- **Weekly score: perkara marks out of 5, N/A lines excluded, summed to JUMLAH MARKAH and averaged into monthly summary** — graphify_out_converted_ws_supv_2026_1e28b2d4_score_scale_na_1_5, graphify_out_converted_ws_supv_2026_1e28b2d4_blank_na_lines_pattern, graphify_out_converted_ws_supv_2026_1e28b2d4_jumlah_markah, graphify_out_converted_ws_supv_2026_1e28b2d4_monthly_summary_table [INFERRED 0.85]
- **Machang Uptown opening left July weeks 2-4 unmarked** — graphify_out_converted_ws_supv_2026_1e28b2d4_event_buka_kedai_baru_machang_uptown, graphify_out_converted_cawangan_ef5ef2a8_branch_dmu, graphify_out_converted_ws_supv_2026_1e28b2d4_tugasan_area_manager_form, graphify_out_converted_ws_supv_2026_1e28b2d4_div0_unfilled_month_pattern [INFERRED 0.85]
- **report_* views data contract for GM/HR reports** — docs_reports_web_brief_report_views_data_contract, docs_reports_web_brief_report_marks, docs_reports_web_brief_report_branch_weekly, docs_reports_web_brief_report_branch_monthly, docs_reports_web_brief_report_company_monthly, docs_reports_web_brief_report_staff_monthly, docs_reports_web_brief_pct_sum_reaggregation, docs_reports_web_brief_due_definition [EXTRACTED 1.00]
- **Workbook-to-database marks import pipeline** — docs_marks_import_2026_staff_workbooks, docs_marks_import_2026_supv_workbooks, docs_marks_import_2026_xlsx_to_import_marks, docs_marks_import_2026_scorer_ids_mapping, docs_marks_import_2026_check_file, docs_marks_import_2026_import_marks_sql, docs_marks_import_2026_keep_mode [EXTRACTED 1.00]
- **RLS branch scoping mechanism** — db_erd_rls_branch_scoping, db_erd_security_definer_helpers, db_erd_app_can_see_branch, db_erd_security_invoker_views, db_erd_rls_test_suite, db_erd_permissive_rls_fails_silently [INFERRED 0.85]

## Communities (87 total, 31 thin omitted)

### Community 0 - "App Screens & Shared UI"
Cohesion: 0.11
Nodes (106): Cawangan(), Stat(), AdminUsers(), Filter, FILTERS, Peranan(), Akaun(), ReturnDetail() (+98 more)

### Community 1 - "Users, Roles & Directory"
Cohesion: 0.06
Nodes (57): Branch, APP_ROLES, branchChangeBlocker(), canSetSupervisorTitle(), CROSS_BRANCH_ROLES, deactivateBlocker(), demotionsFor(), guard() (+49 more)

### Community 2 - "SV/AS Workbook (WS-SUPV)"
Cohesion: 0.05
Nodes (49): AM column (Area Manager mark), <BACK navigation link, CADANGAN (suggestion column), CATATAN (notes row per perkara), Checklist Mingguan (SA/CA/PT/TJH), DIISIKAN OLEH (filled in by), BUKA KEDAI BARU MACHANG UPTOWN (July 2026), JUMLAH MARKAH and % row (+41 more)

### Community 3 - "Branch List & Regions"
Cohesion: 0.07
Nodes (51): AKK - Kuala Kangsar, APR - Pantai Remis, ASP - Sungai Siput, ASU - Sungai Sumun, BBT - Banting, BKP - Kapar, BLB - Kg. Lombong, BPC - Puchong (+43 more)

### Community 4 - "Workbook Marks Converter"
Cohesion: 0.07
Nodes (20): as_date(), bare_number(), catatan_scores(), comment(), find_people_and_blocks(), line_up(), main(), name_like() (+12 more)

### Community 5 - "Tugasan Self-Check"
Cohesion: 0.12
Nodes (33): SignOffRow(), pad(), TUGASAN_ITEMS, TUGASAN_SEED_ENTRIES, TUGASAN_SEED_MONTH_IDX, TUGASAN_SEED_SCOPE, TUGASAN_SEED_SIGNOFF, TugasanItem (+25 more)

### Community 6 - "Expo App Config"
Cohesion: 0.06
Nodes (34): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+26 more)

### Community 7 - "Session & Root Layout"
Cohesion: 0.12
Nodes (28): endSession(), nameOf(), PUBLIC_ROUTES, RootLayout(), sawActivity(), IDLE_LIMIT_MS, MAX_SESSION_MS, mergeStamps() (+20 more)

### Community 8 - "Returns Chain & Stages"
Cohesion: 0.12
Nodes (28): avgOf(), PulanganSelesai(), RouteStat(), BAND_BG, BAND_COLOR, ReturnRow(), AGE_LIMIT_DAYS, ageBand() (+20 more)

### Community 9 - "Data Model (ERD)"
Cohesion: 0.11
Nodes (24): assets table, branch_changes table, branches table, checklist_categories table, checklist_lines table, Checklist Mingguan data model (ERD), mark_lines table, marks table (+16 more)

### Community 10 - "Expo Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, expo, expo-clipboard, expo-constants, expo-file-system, expo-font, @expo-google-fonts/ibm-plex-mono, @expo-google-fonts/public-sans (+21 more)

### Community 11 - "Report Views Contract"
Cohesion: 0.12
Nodes (19): report_branch_monthly view, report_branch_weekly view, report_company_monthly view, report_company_weekly view, report_periods view, report_returns_branch_monthly view, report_returns_open view, report_staff_monthly view (+11 more)

### Community 12 - "Database Test Harness"
Cohesion: 0.08
Nodes (20): description, devDependencies, @electric-sql/pglite, name, private, scripts, test:rls, verify:policies (+12 more)

### Community 13 - "RLS Helper Functions"
Cohesion: 0.10
Nodes (17): users, app_branch_id(), app_can_see_store_ops(), app_is_admin(), app_is_cross_branch(), app_is_exec(), app_role(), app_user_id() (+9 more)

### Community 14 - "Marks & Report Views (SQL)"
Cohesion: 0.22
Nodes (19): branches, checklist_forms, marks, scoring_rules, report_branch_weekly, report_due, report_marks, report_periods (+11 more)

### Community 15 - "CSV Reconciliation Logic"
Cohesion: 0.12
Nodes (22): RFC-4180, ALIASES, EMPTY_MAPPING, FIELD_LABEL, FieldClash, looseEq(), Mapping, Match (+14 more)

### Community 16 - "Core Schema Tables"
Cohesion: 0.11
Nodes (21): PGlite (Postgres engine for tests), supabase/tests/rls.test.mjs (npm run test:rls), branch_changes, checklist_categories, checklist_lines, mark_coverage, mark_lines, marks_branch_period_idx (+13 more)

### Community 17 - "Metro & NativeWind Build"
Cohesion: 0.09
Nodes (22): config, { getDefaultConfig }, { withNativeWind }, main, name, private, version, babel-preset-expo (+14 more)

### Community 18 - "System Architecture"
Cohesion: 0.10
Nodes (15): app_can_see_branch(text), Phone app role-gated sections, payroll-auth Edge Function, payroll_id_changes table, Payroll number identity (users.id), Phone app (marks-app, Expo), Reporting web app (reports-web, GM/HR), Supabase back end (Postgres RLS, Auth, Edge Functions) (+7 more)

### Community 19 - "Staff Checklist Form (KP-STAFF)"
Cohesion: 0.11
Nodes (23): <BACK navigation link, CADANGAN (suggestions) column, CATATAN (remarks) rows, Checklist Mingguan (SA/CA/PT/TJH) form, DIPERIKSA OLEH (checked by), #DIV/0! error pattern, JUMLAH MARKAH (total marks and maximum), Kategori 2 DISPLIN (discipline) (+15 more)

### Community 20 - "Directory Hydration & Reminders"
Cohesion: 0.16
Nodes (19): Peringatan(), currentWeekIdx(), todayShort(), fetchAssets(), fetchRoleChanges(), hydrateDirectory(), notePeriod(), selectMonth() (+11 more)

### Community 21 - "Auth & Supabase Client"
Cohesion: 0.13
Nodes (19): AUTH_EMAIL_DOMAIN, emailForPayroll(), establishSession(), fetchSignedInStaff(), payrollBlocker(), SignedInStaff, SignInResult, signInWithPayroll() (+11 more)

### Community 22 - "Marking Queues"
Cohesion: 0.36
Nodes (16): Done(), ManagerSvQueue(), SupervisorQueue(), PeriodPicker(), StepButton(), QueueBanner(), PERIODS, WEEK_COLS (+8 more)

### Community 23 - "Forms & Scoring Rules"
Cohesion: 0.14
Nodes (17): FormKey, FORMS, Kategori, MONTHS, STOR_FORM, SV_FORM, periodLabel(), Answer (+9 more)

### Community 24 - "Offline Marks Queue"
Cohesion: 0.24
Nodes (18): dismissRejection(), drainOrder(), emptyQueue, enqueue(), isRetryable(), noteAttempt(), QueuedMark, QueueState (+10 more)

### Community 25 - "Return Photo Evidence"
Cohesion: 0.20
Nodes (17): ReturnPhotos(), compress(), deleteReturnPhoto(), fetchReturnPhotos(), MAX_PER_RETURN, MAX_WIDTH, pathFor(), PickedPhoto (+9 more)

### Community 26 - "Tab Navigation"
Cohesion: 0.21
Nodes (12): AdminLayout(), ManagerLayout(), PulanganLayout(), StaffLayout(), SupervisorLayout(), BaseOf, baseTabOptions, OutlineName (+4 more)

### Community 27 - "Reconciliation Screen"
Cohesion: 0.22
Nodes (17): Chip(), Clash(), Note(), PulanganRecon(), Section(), Stat(), canReconcile(), guessMapping() (+9 more)

### Community 28 - "App Icons (Stock Expo)"
Cohesion: 0.12
Nodes (18): Android Adaptive Icon Background, Blueprint Construction Guides (concentric circles, dashed triangle, baseline), Stock Expo Template Icon Artwork (not custom app branding), Android Adaptive Icon Foreground, Glossy Blue Chevron / Caret Mark, Android Monochrome (Themed) Icon, Flat Grey Chevron Silhouette, Web Favicon (+10 more)

### Community 29 - "Dates, Periods & Assets"
Cohesion: 0.20
Nodes (15): currentPeriod(), DAY_NAMES, daysBetweenIso(), FULL_MONTH, MONTH_NAMES, Period, recentPeriods(), SHORT_MONTH (+7 more)

### Community 30 - "Marks API (Supabase)"
Cohesion: 0.17
Nodes (15): samePeriod(), fetchLineIndex(), fetchMarkScores(), fetchMyWeeks(), LineIndex, lineRef(), MarkRow, StaffWeek (+7 more)

### Community 31 - "Returns Store & API"
Cohesion: 0.23
Nodes (15): Disposition, nextReturnId(), ReturnReason, createReturn(), NewReturn, ReturnIds, ReturnRow, setDisposition() (+7 more)

### Community 32 - "Staff Workbook Sheets & Markers"
Cohesion: 0.34
Nodes (16): AZIZUL - SV/AS marker Apr-Sep 2026, CHECKLIST STAFF sheet (blank template), DIISIKAN OLEH (filled by), Uniform 0.8 marking Apr-Aug, khairul (khairul bin talib) - SV/AS marker Jan-Mar 2026, KP0093 SYAZANA IZZAH ZAFIRAH (staff sheet), KP0103 PUTRI WAHIDA AMALIN (staff sheet), KP0108 NOR ASYIKIN (staff sheet) (+8 more)

### Community 33 - "i18n Domain Labels"
Cohesion: 0.12
Nodes (15): FORM_LABEL, VendorField, DISPOSITION_LABEL, STAGE_LABEL, ROLE_BLURB, ROLE_LABEL, SUPERVISOR_TITLE_LABEL, DISPOSITION_EN (+7 more)

### Community 34 - "Shop Cleanliness & Assets (Workbook)"
Cohesion: 0.14
Nodes (14): Recurring air-cond faults (Jan, Apr-Jul 2026), Kategori 7 KEBERSIHAN KEDAI (shop cleanliness), Store asset B) AIR COOLER, Store asset A) AIR-COND, Store asset D) KIPAS, Perkara C) AIR-COND [7 KEBERSIHAN KEDAI], Perkara D) AIR COOLER [7 KEBERSIHAN KEDAI], Perkara F) KALI LIMA / PARKING LOT [7 KEBERSIHAN KEDAI] (+6 more)

### Community 35 - "Returns KPI (SQL)"
Cohesion: 0.18
Nodes (5): return_ageing, return_submission, return_submission_kpi, report_returns_branch_monthly, report_returns_branch_monthly

### Community 36 - "Marks Import Plan"
Cohesion: 0.17
Nodes (8): mark_coverage view, Workbook #DIV/0! problem, _check.sql pre-flight file, Reconciliation with workbook JUMLAH MARKAH, Scorer list / scorer_ids.xlsx mapping, *-STAFF-2026.xlsx outlet workbooks, *-SUPV-2026.xlsx outlet workbooks, supabase/xlsx_to_import_marks.py (converter)

### Community 37 - "Store Asset Log (Workbook)"
Cohesion: 0.17
Nodes (13): CHECKLIST KEDAI sheet (store asset condition), Damaged floor tiles (May-Aug 2026), Store asset G) KEBOCORAN AIR, Store asset E) KOMPUTER, Store asset J) LAIN-LAIN, Store asset C) LAMPU, Store asset F) SALURAN AIR TANDAS, Store asset H) SIGNBOARD (+5 more)

### Community 38 - "PWA Install Prompt"
Cohesion: 0.26
Nodes (12): BeforeInstallPromptEvent, installState, isInAppBrowser(), isIos(), isStandalone(), listeners, notify(), promptInstall() (+4 more)

### Community 39 - "Marking Screen"
Cohesion: 0.30
Nodes (10): MarkPerson(), NOTE_CHIPS, NoteChip, countLines(), lineKey(), monthShort(), formLabel(), draftTotals() (+2 more)

### Community 40 - "Store/Clerk Stage KPI"
Cohesion: 0.24
Nodes (7): ReturnRecord, chain(), days(), nextStage(), STAGE_OWNERS, StageHop, stageKpi

### Community 41 - "Edge Functions"
Cohesion: 0.17
Nodes (4): CORS_HEADERS, CORS_HEADERS, MONTH_NAMES, ROLE_LABEL

### Community 42 - "PWA Manifest"
Cohesion: 0.18
Nodes (10): background_color, display, icons, lang, name, orientation, scope, short_name (+2 more)

### Community 43 - "Verification & Report KPIs"
Cohesion: 0.20
Nodes (7): mark_verifications table, NULL scored_by (no scorer recorded), Coverage / unmarked weeks KPI, final_pct (adjusted total when present), Pass threshold (scoring_rules.pass_threshold), report_marks view, Verification rate KPI

### Community 44 - "Returns Tables (SQL)"
Cohesion: 0.31
Nodes (9): return_events, return_events_return_idx, return_stage_gaps, return_turnaround, returns, returns_branch_idx, suppliers, report_returns_open (+1 more)

### Community 45 - "Returns Data Model (ERD)"
Cohesion: 0.36
Nodes (6): return_events table, return_stage_gaps view, return_turnaround view, returns table, suppliers table, useReturns Zustand store

### Community 46 - "Return Photos Migration (old)"
Cohesion: 0.39
Nodes (5): return_photos, return_photos_cap(), return_photos_cap_check, return_photos_drop_file, return_photos_return_idx

### Community 47 - "App npm Scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, start, test, typecheck, web

### Community 48 - "TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, expo/tsconfig.base

### Community 49 - "Vercel Deploy Config"
Cohesion: 0.29
Nodes (6): buildCommand, cleanUrls, devCommand, framework, outputDirectory, rewrites

### Community 50 - "Checklist Forms & Cohorts"
Cohesion: 0.47
Nodes (5): checklist_forms table, kedai form (22 perkara, staff), 2026 marks history import (Jan-Sep), sv form (19 perkara, SV/AS), stor form (17 perkara, store)

### Community 51 - "Stock Arrangement Perkara"
Cohesion: 0.33
Nodes (6): Kategori 6 PENYUSUAN BARANG (stock arrangement), Perkara B) FIRST IN FIRST OUT [6 PENYUSUAN BARANG], Perkara E) REPACKING [6 PENYUSUAN BARANG], Perkara A) PASTIKAN SETIAP BARANG SUSUN DI ATAS RAK [6 PENYUSUAN BARANG], Perkara D) PERIKSA BARANG TARIKH LUPUT [6 PENYUSUAN BARANG], Perkara C) TURUN & TAMBAH STOK [6 PENYUSUAN BARANG]

### Community 52 - "App Dev Dependencies"
Cohesion: 0.40
Nodes (5): devDependencies, babel-preset-expo, tailwindcss, @types/react, typescript

### Community 53 - "Route Access Rules"
Cohesion: 0.60
Nodes (3): HOME_ROUTE, mayOpen(), SECTION_OWNERS

### Community 54 - "Asset Visibility"
Cohesion: 0.50
Nodes (4): canSeeBranch(), AssetRow, AssetsState, assetsVisibleTo()

### Community 57 - "Payroll Number Changes"
Cohesion: 0.50
Nodes (3): payroll_id_changes, payroll_id_changes_user_idx, users_sync_auth_email

## Ambiguous Edges - Review These
- `SV/AS (Supervisor / Assistant Supervisor)` → `Staff grades SA/CA/PT/TJH`  [AMBIGUOUS]
  graphify-out/converted/WS-SUPV-2026_1e28b2d4.md · relation: conceptually_related_to
- `Area Manager (AM)` → `Branch group D* (Kelantan)`  [AMBIGUOUS]
  graphify-out/converted/WS-SUPV-2026_1e28b2d4.md · relation: conceptually_related_to
- `Branch group Q* (Sarawak)` → `QPJ - Miri`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `Branch group V* (Kuala Lumpur area)` → `VBC - Batu Caves`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `App Icon (1024px master)` → `Splash Screen Icon`  [AMBIGUOUS]
  marks-app/assets/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **297 isolated node(s):** `name`, `slug`, `version`, `scheme`, `orientation` (+292 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 411 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `SV/AS (Supervisor / Assistant Supervisor)` and `Staff grades SA/CA/PT/TJH`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Area Manager (AM)` and `Branch group D* (Kelantan)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Branch group Q* (Sarawak)` and `QPJ - Miri`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Branch group V* (Kuala Lumpur area)` and `VBC - Batu Caves`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `App Icon (1024px master)` and `Splash Screen Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `Expo Dependencies` to `Metro & NativeWind Build`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `react-native` connect `App Screens & Shared UI` to `PWA Install Prompt`, `Marking Screen`, `Returns Chain & Stages`, `Session & Root Layout`, `Metro & NativeWind Build`, `Auth & Supabase Client`, `Marking Queues`, `Return Photo Evidence`, `Tab Navigation`, `Reconciliation Screen`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._