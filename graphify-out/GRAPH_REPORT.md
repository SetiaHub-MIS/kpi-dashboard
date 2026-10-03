# Graph Report - Performance marking app dashboard  (2026-10-04)

## Corpus Check
- 191 files · ~315,137 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .css 1)

## Summary
- 1253 nodes · 4135 edges · 82 communities (54 shown, 28 thin omitted)
- Extraction: 97% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2c27fd4`
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
- tabOptions.tsx
- useMarks.ts
- useQueue.ts
- ReturnPhotos.tsx
- 20260918010000_auto_provision_logins.sql
- labels.ts
- App Icon (1024px master)
- period.ts
- marks.ts
- useReturns.ts
- todayIso
- appUpdates.ts
- asset_issues
- 20260909020100_return_kpi.sql
- supabase/xlsx_to_import_marks.py (converter)
- Kod Cawangan (three-letter branch code)
- install.ts
- mark/[id].tsx
- stageKpi.ts
- xlsx-export/index.ts
- manifest.json
- marks table
- 20260918040000_report_views.sql
- return_events table
- returns
- scripts
- tsconfig.json
- vercel.json
- Phone app updates (EAS Update)
- mark_coverage view
- devDependencies
- app/_layout.tsx
- hydrate.ts
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
- `report_* views data contract` --semantically_similar_to--> `Generated pct column (never stored as input)`  [INFERRED] [semantically similar]
  docs/reports-web-brief.md → db/ERD.md
- `Totals summed from perkara, not JUMLAH cell` --conceptually_related_to--> `Generated pct column (never stored as input)`  [INFERRED]
  docs/marks-import-2026.md → db/ERD.md
- `Read Expo v57 versioned docs before coding` --rationale_for--> `Phone app (marks-app, Expo)`  [INFERRED]
  marks-app/AGENTS.md → docs/reports-web-brief.md
- `Reconciliation with workbook JUMLAH MARKAH` --conceptually_related_to--> `Workbook #DIV/0! problem`  [INFERRED]
  docs/marks-import-2026.md → db/ERD.md
- `stor form (17 perkara, store)` --references--> `checklist_forms table`  [INFERRED]
  docs/reports-web-brief.md → db/ERD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Workbook-to-database marks import pipeline** — docs_marks_import_2026_staff_workbooks, docs_marks_import_2026_supv_workbooks, docs_marks_import_2026_xlsx_to_import_marks, docs_marks_import_2026_scorer_ids_mapping, docs_marks_import_2026_check_file, docs_marks_import_2026_import_marks_sql, docs_marks_import_2026_keep_mode [EXTRACTED 1.00]
- **report_* views data contract for GM/HR reports** — docs_reports_web_brief_report_views_data_contract, docs_reports_web_brief_report_marks, docs_reports_web_brief_report_branch_weekly, docs_reports_web_brief_report_branch_monthly, docs_reports_web_brief_report_company_monthly, docs_reports_web_brief_report_staff_monthly, docs_reports_web_brief_pct_sum_reaggregation, docs_reports_web_brief_due_definition [EXTRACTED 1.00]
- **RLS branch scoping mechanism** — db_erd_rls_branch_scoping, db_erd_security_definer_helpers, db_erd_app_can_see_branch, db_erd_security_invoker_views, db_erd_rls_test_suite, db_erd_permissive_rls_fails_silently [INFERRED 0.85]

## Communities (82 total, 28 thin omitted)

### Community 0 - "useT"
Cohesion: 0.11
Nodes (104): Cawangan(), Stat(), AdminUsers(), Filter, FILTERS, Peranan(), Akaun(), ReturnDetail() (+96 more)

### Community 1 - "useUsers.ts"
Cohesion: 0.07
Nodes (68): UserDetail(), NewUser(), isHq(), APP_ROLES, branchChangeBlocker(), branchesOf(), canSeeBranch(), canSetSupervisorTitle() (+60 more)

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
Nodes (32): SignOffRow(), TUGASAN_ITEMS, TUGASAN_SEED_ENTRIES, TUGASAN_SEED_MONTH_IDX, TUGASAN_SEED_SCOPE, TUGASAN_SEED_SIGNOFF, TugasanItem, tugasanKey() (+24 more)

### Community 6 - "expo"
Cohesion: 0.05
Nodes (40): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+32 more)

### Community 7 - "sessionGuard.ts"
Cohesion: 0.17
Nodes (18): sawActivity(), IDLE_LIMIT_MS, MAX_SESSION_MS, mergeStamps(), sessionEnd, SessionStamps, translate(), arrivedWithResetLink (+10 more)

### Community 8 - "data/returns.ts"
Cohesion: 0.13
Nodes (28): avgOf(), PulanganSelesai(), RouteStat(), BAND_BG, BAND_COLOR, ReturnRow(), AGE_LIMIT_DAYS, ageBand() (+20 more)

### Community 9 - "Checklist Mingguan data model (ERD)"
Cohesion: 0.16
Nodes (18): assets table, branch_changes table, branches table, Checklist Mingguan data model (ERD), role_changes table, scoring_rules table, Seed provenance (REAL vs NEW rows), tugasan_checks table (+10 more)

### Community 10 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-file-system, expo-font, @expo-google-fonts/ibm-plex-mono, @expo-google-fonts/public-sans (+22 more)

### Community 11 - "report_* views data contract"
Cohesion: 0.18
Nodes (9): report_branch_monthly view, report_branch_weekly view, report_company_monthly view, report_company_weekly view, report_periods view, report_returns_open view, report_staff_monthly view, report_today() (Malaysia date) (+1 more)

### Community 12 - "rls.test.mjs"
Cohesion: 0.08
Nodes (20): description, devDependencies, @electric-sql/pglite, name, private, scripts, test:rls, verify:policies (+12 more)

### Community 13 - "users"
Cohesion: 0.08
Nodes (20): users, app_branch_id(), app_can_see_store_ops(), app_is_admin(), app_is_cross_branch(), app_is_exec(), app_role(), app_user_id() (+12 more)

### Community 14 - "marks"
Cohesion: 0.19
Nodes (19): checklist_forms, mark_verifications, marks, scoring_rules, report_due, report_marks, report_periods, report_staff_monthly (+11 more)

### Community 15 - "pulangan-recon.tsx"
Cohesion: 0.10
Nodes (37): RFC-4180, Chip(), Clash(), Note(), PulanganRecon(), Section(), Stat(), ALIASES (+29 more)

### Community 16 - "20260909010000_init.sql"
Cohesion: 0.13
Nodes (16): PGlite (Postgres engine for tests), supabase/tests/rls.test.mjs (npm run test:rls), checklist_categories, checklist_lines, mark_coverage, mark_lines, marks_branch_period_idx, marks_user_idx (+8 more)

### Community 17 - "marks-app/package.json"
Cohesion: 0.09
Nodes (22): config, { getDefaultConfig }, { withNativeWind }, main, name, private, version, babel-preset-expo (+14 more)

### Community 18 - "Reporting web app (reports-web, GM/HR)"
Cohesion: 0.10
Nodes (15): app_can_see_branch(text), Phone app role-gated sections, payroll-auth Edge Function, payroll_id_changes table, Payroll number identity (users.id), Phone app (marks-app, Expo), Reporting web app (reports-web, GM/HR), Supabase back end (Postgres RLS, Auth, Edge Functions) (+7 more)

### Community 19 - "KP-STAFF-2026_89c12a68.md"
Cohesion: 0.18
Nodes (10): Sheet: CHECKLIST KEDAI, Sheet: CHECKLIST STAFF, Sheet: KP0093_SYAZANA IZZAH ZAFIRAH, Sheet: KP0103_PUTRI WAHIDA AMALIN, Sheet: KP0108_NOR ASYIKIN, Sheet: KP0110_FILZAH DIYANA, Sheet: KP0111_PUTERI NUR HAFIZA, Sheet: MY0544_U TIN TUN (+2 more)

### Community 20 - "peringatan.tsx"
Cohesion: 0.27
Nodes (10): Peringatan(), fetchMyReminders(), markReminderRead(), Reminder, sendReminder(), toReminder(), RemindersState, unreadReminders() (+2 more)

### Community 21 - "supabase.ts"
Cohesion: 0.12
Nodes (19): Period, AUTH_EMAIL_DOMAIN, emailForPayroll(), establishSession(), fetchSignedInStaff(), SignedInStaff, SignInResult, signInWithPayroll() (+11 more)

### Community 22 - "tabOptions.tsx"
Cohesion: 0.21
Nodes (12): AdminLayout(), ManagerLayout(), PulanganLayout(), StaffLayout(), SupervisorLayout(), BaseOf, baseTabOptions, OutlineName (+4 more)

### Community 23 - "useMarks.ts"
Cohesion: 0.14
Nodes (18): StepButton(), FORMS, Kategori, MONTHS, PERIODS, STOR_FORM, SV_FORM, WEEK_COLS (+10 more)

### Community 24 - "useQueue.ts"
Cohesion: 0.24
Nodes (18): dismissRejection(), drainOrder(), emptyQueue, enqueue(), isRetryable(), noteAttempt(), QueuedMark, QueueState (+10 more)

### Community 25 - "ReturnPhotos.tsx"
Cohesion: 0.20
Nodes (17): ReturnPhotos(), compress(), deleteReturnPhoto(), fetchReturnPhotos(), MAX_PER_RETURN, MAX_WIDTH, pathFor(), PickedPhoto (+9 more)

### Community 27 - "labels.ts"
Cohesion: 0.12
Nodes (16): FORM_LABEL, FIELD_LABEL, DISPOSITION_LABEL, REASON_LABEL, STAGE_LABEL, ROLE_BLURB, ROLE_LABEL, SUPERVISOR_TITLE_LABEL (+8 more)

### Community 28 - "App Icon (1024px master)"
Cohesion: 0.12
Nodes (18): Android Adaptive Icon Background, Blueprint Construction Guides (concentric circles, dashed triangle, baseline), Stock Expo Template Icon Artwork (not custom app branding), Android Adaptive Icon Foreground, Glossy Blue Chevron / Caret Mark, Android Monochrome (Themed) Icon, Flat Grey Chevron Silhouette, Web Favicon (+10 more)

### Community 29 - "period.ts"
Cohesion: 0.23
Nodes (14): currentPeriod(), DAY_NAMES, FULL_MONTH, MONTH_NAMES, periodLabel(), recentPeriods(), samePeriod(), SHORT_MONTH (+6 more)

### Community 30 - "marks.ts"
Cohesion: 0.23
Nodes (11): FormKey, fetchLineIndex(), fetchMarkScores(), LineIndex, lineRef(), MarkRow, StaffWeek, submitMark() (+3 more)

### Community 31 - "useReturns.ts"
Cohesion: 0.23
Nodes (15): Disposition, nextReturnId(), ReturnReason, createReturn(), NewReturn, ReturnIds, ReturnRow, setDisposition() (+7 more)

### Community 32 - "todayIso"
Cohesion: 0.22
Nodes (12): AssetItem(), daysBetweenIso(), pad(), todayIso(), AssetIssue, AssetRow, fetchAssets(), isAssetOpen() (+4 more)

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
Cohesion: 0.13
Nodes (13): checklist_categories table, checklist_forms table, _check.sql pre-flight file, supabase/import_marks.sql (importer), Reconciliation with workbook JUMLAH MARKAH, kedai form (22 perkara, staff), 2026 marks history import (Jan-Sep), Scorer list / scorer_ids.xlsx mapping (+5 more)

### Community 38 - "install.ts"
Cohesion: 0.25
Nodes (13): InstallCard(), BeforeInstallPromptEvent, installState, isInAppBrowser(), isIos(), isStandalone(), listeners, notify() (+5 more)

### Community 39 - "mark/[id].tsx"
Cohesion: 0.29
Nodes (11): MarkPerson(), NOTE_CHIPS, NoteChip, countLines(), lineKey(), monthShort(), formLabel(), draftTotals() (+3 more)

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
Cohesion: 0.18
Nodes (9): checklist_lines table, mark_lines table, mark_verifications table, marks table, useMarks Zustand store, NULL scored_by (no scorer recorded), final_pct (adjusted total when present), Pass threshold (scoring_rules.pass_threshold) (+1 more)

### Community 44 - "20260918040000_report_views.sql"
Cohesion: 0.36
Nodes (5): branches_default_scoring_rule(), report_branch_monthly, report_branch_weekly, report_company_monthly, report_company_weekly

### Community 45 - "return_events table"
Cohesion: 0.19
Nodes (12): return_events table, return_stage_gaps view, return_turnaround view, returns table, suppliers table, useReturns Zustand store, report_returns_branch_monthly view, return_ageing view (+4 more)

### Community 46 - "returns"
Cohesion: 0.17
Nodes (14): return_events, return_events_return_idx, return_stage_gaps, return_turnaround, returns, returns_branch_idx, suppliers, return_photos (+6 more)

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
Cohesion: 0.33
Nodes (4): mark_coverage view, Workbook #DIV/0! problem, Coverage / unmarked weeks KPI, Verification rate KPI

### Community 52 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, babel-preset-expo, tailwindcss, @types/react, typescript

### Community 53 - "app/_layout.tsx"
Cohesion: 0.16
Nodes (15): endSession(), nameOf(), PUBLIC_ROUTES, RootLayout(), UpdateBanner(), HOME_ROUTE, mayOpen(), SECTION_OWNERS (+7 more)

### Community 54 - "hydrate.ts"
Cohesion: 0.19
Nodes (16): currentWeekIdx(), todayShort(), emptyPerkara(), fetchBranches(), fetchDirectory(), fetchRoleChanges(), fetchStaff(), fetchUserBranches() (+8 more)

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
- **273 isolated node(s):** `name`, `slug`, `version`, `policy`, `url` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 388 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
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
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `react-native` connect `useT` to `useUsers.ts`, `appUpdates.ts`, `install.ts`, `mark/[id].tsx`, `data/returns.ts`, `sessionGuard.ts`, `pulangan-recon.tsx`, `marks-app/package.json`, `peringatan.tsx`, `app/_layout.tsx`, `tabOptions.tsx`, `useMarks.ts`, `supabase.ts`, `ReturnPhotos.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `zustand` connect `peringatan.tsx` to `todayIso`, `useT`, `useUsers.ts`, `useTugasan.ts`, `marks-app/package.json`, `useMarks.ts`, `useQueue.ts`, `useReturns.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._