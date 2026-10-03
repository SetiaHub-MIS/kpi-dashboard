# Graph Report - Performance marking app dashboard  (2026-10-03)

## Corpus Check
- 186 files · ~313,153 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1223 nodes · 4075 edges · 83 communities (53 shown, 30 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f97d6b52`
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
- data/returns.ts
- Checklist Mingguan data model (ERD)
- dependencies
- report_* views data contract
- rls.test.mjs
- users
- marks
- pulangan-recon.tsx
- 20260909010000_init.sql
- marks-app/package.json
- Reporting web app (reports-web, GM/HR)
- KP-STAFF-2026_89c12a68.md
- peringatan.tsx
- supabase.ts
- users table
- useMarks.ts
- useQueue.ts
- ReturnPhotos.tsx
- tabOptions.tsx
- 20260918040000_report_views.sql
- App Icon (1024px master)
- checklist.ts
- marks.ts
- useReturns.ts
- metro.config.js
- labels.ts
- asset_issues
- returns
- supabase/xlsx_to_import_marks.py (converter)
- Kod Cawangan (three-letter branch code)
- install.ts
- data/assets.ts
- stageKpi.ts
- xlsx-export/index.ts
- manifest.json
- marks table
- return_events table
- 20260910020000_return_photos.sql
- scripts
- tsconfig.json
- vercel.json
- checklist_forms table
- devDependencies
- app/_layout.tsx
- hydrate.ts
- return_photos_due_for_purge
- 20260918020000_payroll_number_changes.sql
- strings.ts
- resolve-alias.mjs
- import_marks.sql
- mark_verifications
- mark_queries
- reminders
- graphify knowledge graph (project rules)
- nativewind-env.d.ts

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
- `Totals summed from perkara, not JUMLAH cell` --conceptually_related_to--> `Generated pct column (never stored as input)`  [INFERRED]
  docs/marks-import-2026.md → db/ERD.md
- `Read Expo v57 versioned docs before coding` --rationale_for--> `Phone app (marks-app, Expo)`  [INFERRED]
  marks-app/AGENTS.md → docs/reports-web-brief.md
- `stor form (17 perkara, store)` --references--> `checklist_forms table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md
- `reminders table` --references--> `users table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Workbook-to-database marks import pipeline** — docs_marks_import_2026_staff_workbooks, docs_marks_import_2026_supv_workbooks, docs_marks_import_2026_xlsx_to_import_marks, docs_marks_import_2026_scorer_ids_mapping, docs_marks_import_2026_check_file, docs_marks_import_2026_import_marks_sql, docs_marks_import_2026_keep_mode [EXTRACTED 1.00]
- **report_* views data contract for GM/HR reports** — docs_reports_web_brief_report_views_data_contract, docs_reports_web_brief_report_marks, docs_reports_web_brief_report_branch_weekly, docs_reports_web_brief_report_branch_monthly, docs_reports_web_brief_report_company_monthly, docs_reports_web_brief_report_staff_monthly, docs_reports_web_brief_pct_sum_reaggregation, docs_reports_web_brief_due_definition [EXTRACTED 1.00]
- **RLS branch scoping mechanism** — db_erd_rls_branch_scoping, db_erd_security_definer_helpers, db_erd_app_can_see_branch, db_erd_security_invoker_views, db_erd_rls_test_suite, db_erd_permissive_rls_fails_silently [INFERRED 0.85]

## Communities (83 total, 30 thin omitted)

### Community 0 - "useT"
Cohesion: 0.10
Nodes (111): Cawangan(), Stat(), AdminUsers(), Filter, FILTERS, Peranan(), Akaun(), ReturnDetail() (+103 more)

### Community 1 - "useUsers.ts"
Cohesion: 0.07
Nodes (75): UserDetail(), NewUser(), APP_ROLES, branchChangeBlocker(), branchesOf(), canSeeBranch(), canSetSupervisorTitle(), CROSS_BRANCH_ROLES (+67 more)

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
Cohesion: 0.06
Nodes (34): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+26 more)

### Community 7 - "sessionGuard.ts"
Cohesion: 0.21
Nodes (15): IDLE_LIMIT_MS, MAX_SESSION_MS, mergeStamps(), sessionEnd, SessionStamps, checkSession(), clearSession(), isStamps() (+7 more)

### Community 8 - "data/returns.ts"
Cohesion: 0.13
Nodes (27): avgOf(), PulanganSelesai(), RouteStat(), BAND_BG, BAND_COLOR, ReturnRow(), AGE_LIMIT_DAYS, ageBand() (+19 more)

### Community 9 - "Checklist Mingguan data model (ERD)"
Cohesion: 0.17
Nodes (16): assets table, branches table, Checklist Mingguan data model (ERD), returns table, scoring_rules table, Seed provenance (REAL vs NEW rows), suppliers table, tugasan_checks table (+8 more)

### Community 10 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, expo, expo-clipboard, expo-constants, expo-file-system, expo-font, @expo-google-fonts/ibm-plex-mono, @expo-google-fonts/public-sans (+21 more)

### Community 11 - "report_* views data contract"
Cohesion: 0.20
Nodes (9): Coverage / unmarked weeks KPI, report_branch_monthly view, report_branch_weekly view, report_company_monthly view, report_company_weekly view, report_periods view, report_staff_monthly view, v1 report list (Dashboard, Outlets, Staff, Pulangan) (+1 more)

### Community 12 - "rls.test.mjs"
Cohesion: 0.08
Nodes (20): description, devDependencies, @electric-sql/pglite, name, private, scripts, test:rls, verify:policies (+12 more)

### Community 13 - "users"
Cohesion: 0.07
Nodes (21): PGlite (Postgres engine for tests), supabase/tests/rls.test.mjs (npm run test:rls), users, app_branch_id(), app_can_see_store_ops(), app_is_admin(), app_is_cross_branch(), app_is_exec() (+13 more)

### Community 14 - "marks"
Cohesion: 0.17
Nodes (20): checklist_forms, mark_coverage, marks, marks_branch_period_idx, marks_user_idx, scoring_rules, report_due, report_marks (+12 more)

### Community 15 - "pulangan-recon.tsx"
Cohesion: 0.10
Nodes (37): RFC-4180, Chip(), Clash(), Note(), PulanganRecon(), Section(), Stat(), ALIASES (+29 more)

### Community 16 - "20260909010000_init.sql"
Cohesion: 0.14
Nodes (19): assets, branch_changes, branches, checklist_categories, checklist_lines, mark_lines, role_changes, role_changes_user_idx (+11 more)

### Community 17 - "marks-app/package.json"
Cohesion: 0.10
Nodes (20): main, name, private, version, babel-preset-expo, expo-clipboard, expo-constants, expo-font (+12 more)

### Community 18 - "Reporting web app (reports-web, GM/HR)"
Cohesion: 0.12
Nodes (12): app_can_see_branch(text), Phone app role-gated sections, Phone app (marks-app, Expo), Reporting web app (reports-web, GM/HR), Supabase back end (Postgres RLS, Auth, Edge Functions), user_branches table (Area Manager extra outlets), user_role enum (nine roles), marks-app CLAUDE.md includes AGENTS.md (+4 more)

### Community 19 - "KP-STAFF-2026_89c12a68.md"
Cohesion: 0.18
Nodes (10): Sheet: CHECKLIST KEDAI, Sheet: CHECKLIST STAFF, Sheet: KP0093_SYAZANA IZZAH ZAFIRAH, Sheet: KP0103_PUTRI WAHIDA AMALIN, Sheet: KP0108_NOR ASYIKIN, Sheet: KP0110_FILZAH DIYANA, Sheet: KP0111_PUTERI NUR HAFIZA, Sheet: MY0544_U TIN TUN (+2 more)

### Community 20 - "peringatan.tsx"
Cohesion: 0.27
Nodes (10): Peringatan(), fetchMyReminders(), markReminderRead(), Reminder, sendReminder(), toReminder(), RemindersState, unreadReminders() (+2 more)

### Community 21 - "supabase.ts"
Cohesion: 0.11
Nodes (20): Period, AUTH_EMAIL_DOMAIN, emailForPayroll(), establishSession(), fetchSignedInStaff(), SignedInStaff, SignInResult, signInWithPayroll() (+12 more)

### Community 22 - "users table"
Cohesion: 0.32
Nodes (8): branch_changes table, role_changes table, users table, useUsers Zustand store, payroll-auth Edge Function, payroll_id_changes table, Payroll number identity (users.id), reminders table

### Community 23 - "useMarks.ts"
Cohesion: 0.19
Nodes (13): countLines(), Answer, scoredOnly(), Totals, totalsOf(), Draft, draftTotals(), emptyDraft (+5 more)

### Community 24 - "useQueue.ts"
Cohesion: 0.24
Nodes (18): dismissRejection(), drainOrder(), emptyQueue, enqueue(), isRetryable(), noteAttempt(), QueuedMark, QueueState (+10 more)

### Community 25 - "ReturnPhotos.tsx"
Cohesion: 0.24
Nodes (15): ReturnPhotos(), compress(), deleteReturnPhoto(), fetchReturnPhotos(), MAX_PER_RETURN, MAX_WIDTH, pathFor(), PickedPhoto (+7 more)

### Community 26 - "tabOptions.tsx"
Cohesion: 0.21
Nodes (12): AdminLayout(), ManagerLayout(), PulanganLayout(), StaffLayout(), SupervisorLayout(), BaseOf, baseTabOptions, OutlineName (+4 more)

### Community 27 - "20260918040000_report_views.sql"
Cohesion: 0.36
Nodes (5): branches_default_scoring_rule(), report_branch_monthly, report_branch_weekly, report_company_monthly, report_company_weekly

### Community 28 - "App Icon (1024px master)"
Cohesion: 0.12
Nodes (18): Android Adaptive Icon Background, Blueprint Construction Guides (concentric circles, dashed triangle, baseline), Stock Expo Template Icon Artwork (not custom app branding), Android Adaptive Icon Foreground, Glossy Blue Chevron / Caret Mark, Android Monochrome (Themed) Icon, Flat Grey Chevron Silhouette, Web Favicon (+10 more)

### Community 29 - "checklist.ts"
Cohesion: 0.15
Nodes (20): FORM_LABEL, FormKey, FORMS, Kategori, STOR_FORM, SV_FORM, currentPeriod(), DAY_NAMES (+12 more)

### Community 30 - "marks.ts"
Cohesion: 0.29
Nodes (9): fetchLineIndex(), fetchMarkScores(), LineIndex, lineRef(), MarkRow, submitMark(), SubmitMode, SubmitResult (+1 more)

### Community 31 - "useReturns.ts"
Cohesion: 0.20
Nodes (17): Disposition, nextReturnId(), ReturnReason, ReturnRecord, Stage, createReturn(), NewReturn, one() (+9 more)

### Community 32 - "metro.config.js"
Cohesion: 0.33
Nodes (5): config, { getDefaultConfig }, { withNativeWind }, expo, nativewind

### Community 33 - "labels.ts"
Cohesion: 0.12
Nodes (16): FIELD_LABEL, VendorField, DISPOSITION_LABEL, REASON_LABEL, STAGE_LABEL, ROLE_BLURB, ROLE_LABEL, SUPERVISOR_TITLE_LABEL (+8 more)

### Community 34 - "asset_issues"
Cohesion: 0.60
Nodes (5): asset_issues, asset_issues_open, asset_issues_refresh_summary(), asset_issues_stamp_resolver(), assets_refresh_summary()

### Community 35 - "returns"
Cohesion: 0.12
Nodes (14): return_events, return_events_return_idx, return_stage_gaps, return_turnaround, returns, returns_branch_idx, suppliers, return_ageing (+6 more)

### Community 36 - "supabase/xlsx_to_import_marks.py (converter)"
Cohesion: 0.17
Nodes (8): mark_coverage view, Workbook #DIV/0! problem, _check.sql pre-flight file, Reconciliation with workbook JUMLAH MARKAH, Scorer list / scorer_ids.xlsx mapping, *-STAFF-2026.xlsx outlet workbooks, *-SUPV-2026.xlsx outlet workbooks, supabase/xlsx_to_import_marks.py (converter)

### Community 38 - "install.ts"
Cohesion: 0.26
Nodes (12): BeforeInstallPromptEvent, installState, isInAppBrowser(), isIos(), isStandalone(), listeners, notify(), promptInstall() (+4 more)

### Community 40 - "stageKpi.ts"
Cohesion: 0.31
Nodes (7): StageOwner, chain(), days(), nextStage(), STAGE_OWNERS, StageHop, stageKpi

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

### Community 50 - "checklist_forms table"
Cohesion: 0.38
Nodes (6): checklist_categories table, checklist_forms table, kedai form (22 perkara, staff), 2026 marks history import (Jan-Sep), sv form (19 perkara, SV/AS), stor form (17 perkara, store)

### Community 52 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, babel-preset-expo, tailwindcss, @types/react, typescript

### Community 53 - "app/_layout.tsx"
Cohesion: 0.16
Nodes (14): endSession(), nameOf(), PUBLIC_ROUTES, RootLayout(), sawActivity(), HOME_ROUTE, mayOpen(), SECTION_OWNERS (+6 more)

### Community 54 - "hydrate.ts"
Cohesion: 0.17
Nodes (19): AssetItem(), currentWeekIdx(), daysBetweenIso(), todayIso(), todayShort(), AssetIssue, AssetRow, fetchAssets() (+11 more)

### Community 57 - "20260918020000_payroll_number_changes.sql"
Cohesion: 0.50
Nodes (3): payroll_id_changes, payroll_id_changes_user_idx, users_sync_auth_email

### Community 59 - "strings.ts"
Cohesion: 0.40
Nodes (4): Locale, STRINGS, translate(), endedMessage()

## Ambiguous Edges - Review These
- `App Icon (1024px master)` → `Splash Screen Icon`  [AMBIGUOUS]
  marks-app/assets/splash-icon.png · relation: conceptually_related_to
- `QPJ - Miri` → `Branch group Q* (Sarawak)`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to
- `VBC - Batu Caves` → `Branch group V* (Kuala Lumpur area)`  [AMBIGUOUS]
  graphify-out/converted/Cawangan_ef5ef2a8.md · relation: conceptually_related_to

## Knowledge Gaps
- **261 isolated node(s):** `name`, `slug`, `version`, `scheme`, `orientation` (+256 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 375 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `App Icon (1024px master)` and `Splash Screen Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `QPJ - Miri` and `Branch group Q* (Sarawak)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `VBC - Batu Caves` and `Branch group V* (Kuala Lumpur area)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `dependencies` to `marks-app/package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `react-native` connect `useT` to `useUsers.ts`, `install.ts`, `sessionGuard.ts`, `data/returns.ts`, `pulangan-recon.tsx`, `marks-app/package.json`, `peringatan.tsx`, `app/_layout.tsx`, `supabase.ts`, `ReturnPhotos.tsx`, `tabOptions.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `react` connect `useT` to `useUsers.ts`, `install.ts`, `pulangan-recon.tsx`, `marks-app/package.json`, `app/_layout.tsx`, `ReturnPhotos.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _261 weakly-connected nodes found - possible documentation gaps or missing edges._