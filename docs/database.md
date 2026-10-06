# Checklist Mingguan — database reference

**As of 6 October 2026**, up to and including migration `20261006010000_hr_administers.sql`.

This document was written from the schema itself: all 41 migrations were
applied to a real Postgres (the PGlite test harness) and the catalog was read
back. The live database matches it — `supabase/tests/verify_policies.sql` ran
on the live project on 6 Oct 2026 and every check passed. When the two
disagree, the migrations win; update this file (see
[Keeping this current](#keeping-this-current)).

Contents

1. [The server](#1-the-server)
2. [Sign-in and accounts (Auth)](#2-sign-in-and-accounts-auth)
3. [Who may do what](#3-who-may-do-what)
4. [Tables](#4-tables)
5. [Views](#5-views)
6. [Functions](#6-functions)
7. [Triggers](#7-triggers)
8. [File storage](#8-file-storage)
9. [Edge Functions](#9-edge-functions)
10. [Scheduled jobs](#10-scheduled-jobs)
11. [Admin scripts](#11-admin-scripts)
12. [Migration history](#12-migration-history)
13. [Keeping this current](#keeping-this-current)

---

## 1. The server

Everything runs on one **Supabase** project. There is no other server.

| Item | Value |
|---|---|
| Project ref | `aorkigafuepkexymexjt` |
| API URL | `https://aorkigafuepkexymexjt.supabase.co` |
| Dashboard | `https://supabase.com/dashboard/project/aorkigafuepkexymexjt` |
| Database | PostgreSQL 15 or later (the views need `security_invoker`, added in 15) |
| Time zone | The server runs on UTC. Every "today" in the reports uses `report_today()`, which is Malaysia's date (UTC+8). |

**What lives in the project:**

| Part | Used for |
|---|---|
| Database (`public` schema) | All app data: 24 tables, 17 views, 39 functions, 8 triggers, 49 row-level security policies. |
| Auth | One login per person, keyed on the payroll number. See section 2. |
| Storage | One private bucket, `return-photos`, for damage-return evidence. See section 8. |
| Edge Functions | `payroll-auth`, `xlsx-export`, `purge-return-photos`. See section 9. |
| Extensions | `pgcrypto` (password hashing, in the `extensions` schema), `pg_cron` and `pg_net` (the nightly photo purge), Vault (holds the service-role key for that job). |

**Who connects, and with what:**

| Client | Key | What it can reach |
|---|---|---|
| Phone app (Vercel web build) | Anon key + the signed-in person's session token | Only what row-level security lets that person see. The anon key is public by design. |
| Reports web app | Same as the phone app | Same — the `report_*` views run under the caller's own permissions. |
| Edge Functions | Service-role key (from the Supabase environment) or the caller's token | `payroll-auth` and `purge-return-photos` use the service role; `xlsx-export` uses the caller's token. |
| Supabase SQL editor | Project owner | Everything, past row-level security. This is where migrations and admin scripts are run. |

**Secrets are never in the repository.** The service-role key lives in the
Edge Function environment (set by Supabase) and in Vault under the name
`service_role_key`. The starting password lives in the `login_settings` table.
The phone app's `.env.local` holds only the URL and the anon key.

**How changes reach the live database.** There is no automatic deploy. Each new
file in `supabase/migrations/` is pasted into the SQL editor and run, in
filename order, once. Then `supabase/tests/verify_policies.sql` is run, and
every row must read PASS. Edge Functions are deployed from the repository
root with `npx supabase functions deploy <name>`.

---

## 2. Sign-in and accounts (Auth)

### How a person signs in

1. The person types their **payroll number** (for example `KP0093`) and password into the app.
2. The app calls the `payroll-auth` Edge Function with them.
3. `payroll-auth` looks the payroll number up in `users` (with the service role) and works out the login address: the person's real e-mail if `users.email` is set, otherwise `kp0093@checklist.local`. The address never leaves the function.
4. It signs in to Supabase Auth with that address and the password, and returns the session tokens to the app.
5. From then on every request carries the session token. The database knows the caller through `auth.uid()`, which matches `users.auth_user_id`.

General Manager accounts are turned away by the phone app after sign-in; they use the reports web app.

### How a login is created

- **Automatically.** When a row is inserted into `users` (from the app or SQL), the trigger `users_provision_login` calls `provision_login()`. It creates the Auth account, sets the password to the **starting password** stored in `login_settings`, and writes the new account's id into `users.auth_user_id`. Reactivating someone who never had a login does the same.
- If `login_settings` has no row, adding a person fails with a message saying so. That is deliberate: a person who exists but cannot sign in is the failure this prevents.
- `supabase/provision_logins.sql` is the manual backfill for rows created before the trigger existed.

### Keeping the login address current

`users_sync_auth_email` / `sync_auth_email()` copies `users.email` (or the
`@checklist.local` address when there is none) onto the Auth account whenever
the e-mail, the payroll number or the link changes. A person may change only
their own e-mail, through `set_my_email()`.

### Passwords

| Situation | What happens |
|---|---|
| New account | Starts on the password in `login_settings`. The person changes it under **My account** after their first sign-in. |
| Person changes their own | **My account → Change password** in the app (at least 6 characters). |
| Forgotten | Admin runs `supabase/reset_password.sql` (payroll number + new password). It also signs out every phone still holding the old session. If the person has a real e-mail, `payroll-auth`'s `request-reset` can send Supabase's reset mail instead. |

### Session limits (enforced by the app)

The app signs a person out after **15 minutes** without a touch, or **3 hours**
after signing in (`marks-app/src/data/sessionLimits.ts`).

---

## 3. Who may do what

The database, not the app, decides what each person can see and change. Every
table has **row-level security** on, and every policy is built from a small set
of helper functions (section 6) that look the caller up in `users`.

**Outlet reach.** Most people see only their own outlet (`users.branch_id`).
An Area Manager also sees every outlet listed for them in `user_branches`.
Manager, General Manager, HR and Admin hold no outlet and see all of them.

| Role | Sees | Writes |
|---|---|---|
| Shop Staff (`staff`) | People, marks and returns at their outlet. | Nothing but their own e-mail. |
| Store Staff / Store Clerk (`store`, `clerk`) | People and marks at HQ; every outlet's returns. | Returns, return stages, photos, new suppliers. |
| Supervisor (`supervisor`, SV or Asisten) | People, marks and returns at their outlet. | Marks for shop and store staff; adds Shop Staff; asset issues at their outlet. |
| Area Manager (`area_manager`) | The same, at every outlet they cover; plus Tugasan. | Marks for supervisors; verifies marks; Tugasan; asset issues; reminders; adds Shop Staff and Supervisors; tags SV/Asisten. |
| Manager (`manager`) | Every outlet, kedai side only — no returns, no store marks. | As an Area Manager, over every outlet. |
| General Manager (`general_manager`) | Everything, including returns. | Marks, verifications, reminders and returns anywhere. Set only through SQL. |
| HR (`human_resources`) and Admin (`admin`) | Everything except returns. | Accounts, roles, outlets, change logs, checklist reference data, scoring rules, SV/Asisten titles. As head office the database also lets them correct marks and verifications, though the app gives them no screen for it. Since 6 Oct 2026 HR has exactly Admin's rights. |

**What the app shows is narrower than what the database allows.** For
example, Shop Staff can read every mark at their outlet at the database level,
but the app only ever shows them their own. The database rules above are the
security boundary; the app's screens are a choice of what to display.

**Table privileges.** Row-level security only filters rows; the signed-in role
also needs table privileges. `authenticated` is granted select, insert, update
and delete on every table and view, except:

- `assets` — read only (its state is kept by a trigger).
- `asset_issues` — read; insert only `asset_id, note, opened_on`; update only `note, resolved_on`; no delete.
- `login_settings` — no access at all.

`anon` (signed out) is granted nothing.

---

## 4. Tables

24 tables. All have row-level security on. Payroll numbers (`users.id`) are
referenced with `ON UPDATE CASCADE`, so changing a number carries every record
with it.

### People and outlets

| Table | Holds | Key rules |
|---|---|---|
| `branches` | Outlets. `id` is the short code (`DMC`), 2–5 capitals or digits, permanent. `active = false` closes an outlet. | Read by anyone signed in. Written by Admin/HR. A new row automatically gets its `scoring_rules` row and its ten `assets` rows. |
| `users` | Every person. `id` is the payroll number (2–12 capitals/digits). Also `name`, `short_name`, `initials`, `role`, `branch_id` (null for head office), `active`, `joined_on`, `auth_user_id`, `email`, `supervisor_title`. | Read: Admin/HR, yourself, and people at outlets you reach. Written by Admin/HR. A Supervisor may insert Shop Staff, an Area Manager Shop Staff or Supervisors, at outlets they cover. `supervisor_title` only on supervisors. |
| `user_branches` | Extra outlets an Area Manager covers, beyond `users.branch_id`. | Only Area Managers may have rows (trigger). Written by Admin/HR. |
| `role_changes` | Every promotion, demotion and transfer: who, from, to, by whom, when. | Admin/HR only. |
| `branch_changes` | Every change of outlet. | Admin/HR only. |
| `payroll_id_changes` | Every change of payroll number. | Admin/HR only. |
| `login_settings` | One row: the starting password for new logins (at least 6 characters). | No app access; read only by `provision_login()`. Set in the SQL editor. |

### Checklist reference data

| Table | Holds |
|---|---|
| `checklist_forms` | The three forms: `kedai` (Shop Staff, 22 perkara), `stor` (Store Staff, 17), `sv` (Supervisor, 19). One form per role. |
| `checklist_categories` | The numbered categories of each form. |
| `checklist_lines` | One scorable perkara each. |
| `scoring_rules` | Per outlet: pass mark (80), scale (5 or 10; 5 today), and whether the Area Manager must verify. |
| `tugasan_items` | The Area Manager's self-check items (`peti_cash`, `x_report`). |
| `suppliers` | Suppliers returns go back to. |

Read by anyone signed in (scoring rules: by those who reach the outlet); written by Admin/HR. The store team and the General Manager may also add a supplier.

### Marks

| Table | Holds | Key rules |
|---|---|---|
| `marks` | One weekly score per person: `user_id`, `branch_id`, `form_key`, year, month, `week_no` (1–4), `total_score`, `max_score`, `note`, `scored_by`. One per person per week. | `pct` is **generated** from total ÷ max, never typed. `branch_id` and `form_key` are a snapshot of where the person was when marked. Readable by whoever reaches the outlet (store marks hidden from the Manager). Written by those allowed to score. **Locked once verified.** |
| `mark_lines` | The score for each perkara (0 up to the scale). | A perkara marked N/A has no row and does not count in `max_score`; 0 counts. Locked with its mark. |
| `mark_verifications` | The Area Manager's confirmation, optionally with `adjusted_to` (a corrected total). | Absence means "not yet verified". |

### Area Manager's Tugasan

| Table | Holds |
|---|---|
| `tugasan_checks` | Per outlet × month × week × item: done, note (e.g. cash amount), date inspected. |
| `tugasan_signoffs` | Per outlet × month × week: filled by, checked by, date signed. |

Read by Area Managers/Managers of that outlet and head office; written by Area Managers/Managers and Admin/HR. Staff and supervisors cannot read them.

### Shop assets (Aset kedai)

| Table | Holds | Key rules |
|---|---|---|
| `assets` | The fixed list per outlet: A) AIR-COND … J) LAIN-LAIN. Plus a summary: `is_open`, `note`, `opened_on`, `resolved_on`. | Read only to the app. The summary columns are kept up to date by a trigger from `asset_issues`. |
| `asset_issues` | One row per reported problem: `note`, `opened_on`, `opened_by`, `resolved_on`, `resolved_by`. Several may be open on the same asset. | Supervisors, Area Managers, Managers and head office at that outlet may report and resolve. Who resolved it is stamped by the database. Never deleted from the app. |

### Returns (pulangan)

| Table | Holds | Key rules |
|---|---|---|
| `returns` | One bill being returned: `ref` (PR0001), outlet, bill number and date, reason (`damage`/`expired`), remark, supplier, disposition (`supplier`/`discard`). | Read by the store team (all outlets), anyone posted at or covering that outlet, and the General Manager — not the Manager, Admin or HR. Written by the store team and the General Manager. |
| `return_events` | One row per stage reached, with its date: received → submitted to clerk → segregated → supplier called → picked up / discarded → adjusted. | Same visibility as the bill. |
| `return_photos` | Up to **2** photos per return; the file itself is in Storage. | Kept until 30 days after the bill is adjusted, then purged (section 10). |

### Reminders

| Table | Holds | Key rules |
|---|---|---|
| `reminders` | An in-app nudge from an Area Manager/Manager (or head office) to a Supervisor about unmarked staff. | The recipient may only mark it read. |

### Enumerated types

| Type | Values |
|---|---|
| `user_role` | staff, store, clerk, supervisor, area_manager, manager, general_manager, human_resources, admin |
| `supervisor_title` | sv, asisten |
| `return_reason` | damage, expired |
| `return_disposition` | supplier, discard |
| `return_stage` | received, submitted_to_clerk, segregated, supplier_called, picked_up, discarded, adjusted |
| `tugasan_note_kind` | amount, status |

---

## 5. Views

All 17 views are `security_invoker`: they run with the **caller's** permissions,
so a view never shows a row its underlying table would hide.

**For the reports web app (`report_*`):**

| View | One row per |
|---|---|
| `report_periods` | Month, oldest first to the current month, with how many checklist weeks have started. |
| `report_due` | Active person × month they are due a mark. |
| `report_marks` | Mark, with the pass rule applied; `final_pct` is what the phone app shows. |
| `report_staff_monthly` | Person × month × form: the four weekly percentages, average, passes, verifications, SV/Asisten title. |
| `report_branch_weekly` | Outlet × week × form: headcount, marked, gaps, passed. |
| `report_branch_monthly` | Outlet × month × form: the same, for the month. |
| `report_company_weekly` / `report_company_monthly` | The whole company, summed from the outlet rows. |
| `report_tugasan_branch_monthly` | Outlet × month: Tugasan weeks filled and checked. |
| `report_returns_branch_monthly` | Outlet × month received: returns received, on time, open, breach, overdue, average turnaround. |
| `report_returns_open` | Every return not yet adjusted, with its ageing status and last stage. |

**Returns KPI building blocks:**

| View | Shows |
|---|---|
| `return_turnaround` | Days from received to adjusted (open bills age against today). |
| `return_submission` | Each return's Friday hand-over deadline and whether it was met. |
| `return_submission_kpi` | The hand-over rate summarised. |
| `return_ageing` | `ok`, `breach` (past 60 days, inside the 7-day window to clear) or `overdue`. |
| `return_stage_gaps` | Days spent between each stage, for bottlenecks. |

**Other:** `mark_coverage` — which person × week cells have no mark.

---

## 6. Functions

**Security helpers.** Each answers one question about the signed-in person. They
are `SECURITY DEFINER` (they read `users` past row-level security) and every
policy is built from them — change a rule here, not in twenty policies.

| Function | Answers |
|---|---|
| `app_user_id()`, `app_role()`, `app_branch_id()` | The caller's payroll number, role and home outlet. |
| `app_is_admin()` | Is the caller Admin or HR? (the administration console) |
| `app_is_exec()` | General Manager, HR or Admin? |
| `app_is_cross_branch()` | A head-office role that sees every outlet? |
| `app_manages_outlets()` | Area Manager or Manager? |
| `app_can_see_branch(outlet)` | May the caller see this outlet? |
| `app_can_see_mark(outlet, form)` | Outlet reach plus: store marks hidden from the Manager. |
| `app_can_score()` | May the caller write marks? |
| `app_mark_verified(mark)` | Is this mark verified (and so locked)? |
| `app_can_read_tugasan(outlet)` | May the caller read this outlet's Tugasan? |
| `app_can_see_store_ops()` | May the caller see store-side marks? (everyone but the Manager) |
| `app_can_see_returns()`, `app_is_returns_writer()`, `app_is_central_store()`, `app_can_see_branch_returns(outlet)` | The returns rules. |

**Called by the app:**

| Function | Does |
|---|---|
| `set_my_email(new_email)` | Lets anyone change their own e-mail, and nothing else on their row. |
| `set_supervisor_title(person, title)` | Admin/HR, or the Area Manager over that outlet, tags a supervisor `sv` or `asisten`. |

**Report and returns arithmetic:** `report_today()` (Malaysia's date),
`report_week_of(date)` (checklist week 1–4: days 1–7, 8–14, 15–21, 22–end),
`report_first_week(…)` (the week a new person is first due),
`return_due_on(received)` (the Friday hand-over deadline; weekend arrivals roll to the next week),
`return_age_limit_days()` (60), `return_grace_days()` (7), `stage_rank(stage)`.

**Used by triggers and jobs:** `provision_login()`, `sync_auth_email()`,
`branches_default_assets(outlet)` and `asset_catalogue()` (the ten asset rows),
`assets_refresh_summary(asset)`, `return_photos_due_for_purge(days, grace)`
(service role only), plus the trigger functions in section 7.

---

## 7. Triggers

| Table | Trigger | Does |
|---|---|---|
| `users` | `users_provision_login` | After insert, or on reactivation: creates the person's login on the starting password. |
| `users` | `users_sync_auth_email` | Keeps the login address in step with the e-mail and payroll number. |
| `user_branches` | `user_branches_role_check` | Refuses extra outlets for anyone who is not an Area Manager. |
| `branches` | `branches_default_scoring_rule` | Gives a new outlet its scoring rules. |
| `branches` | `branches_default_assets` | Gives a new outlet its ten asset rows. |
| `asset_issues` | `asset_issues_stamp_resolver` | Records who resolved an issue; a resolve date earlier than the open date is moved up to it. |
| `asset_issues` | `asset_issues_refresh_summary` | Recomputes the asset row's open/closed summary. |
| `return_photos` | `return_photos_cap_check` | Refuses a third photo on one return. |

---

## 8. File storage

| Bucket | Settings | Access |
|---|---|---|
| `return-photos` | Private. 1 MB per file. JPEG or WebP only. Path: `<outlet>/<return ref>/<file>`. At most 2 per return. | Storage policies follow the returns rules: whoever may see the return may see its photos. |

Files are never deleted with SQL — Supabase blocks it. The app and the purge
job remove the file through the Storage API first, then the `return_photos` row.

---

## 9. Edge Functions

All three live in `supabase/functions/` and are deployed with
`npx supabase functions deploy <name>` from the repository root.

| Function | Called by | Runs as | Does |
|---|---|---|---|
| `payroll-auth` | The sign-in screen | Service role (lookup), then a normal sign-in | `sign-in`: turns a payroll number into the login address and signs in. `request-reset`: sends Supabase's password-reset mail; always answers "ok", so it cannot reveal who is on the payroll. |
| `xlsx-export` | Export button on the Area Manager home | The caller's own session | Builds the month's marks workbook from exactly what the caller can see. |
| `purge-return-photos` | The nightly job, or an Admin by hand | Service role or an active Admin | Removes photos 30 days after their bill was adjusted, plus orphan files. `{"dry_run": true}` lists without deleting. Refuses fewer than 30 days. |

---

## 10. Scheduled jobs

| Job | When | Does |
|---|---|---|
| `purge-return-photos` (`pg_cron`, job id 1) | Daily, 19:00 UTC (03:00 Malaysia) | `pg_net` calls the Edge Function with the service-role key from Vault. Set up by `supabase/schedule_photo_purge.sql`. |

To check it ran:

```sql
SELECT status, return_message, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

---

## 11. Admin scripts

These are kept in `supabase/` and run by hand in the SQL editor. They are not migrations.

| Script | Purpose |
|---|---|
| `reset_password.sql` | Give one person a new password and sign out their phones. |
| `provision_logins.sql` | Create logins for any active person who has none. |
| `import_marks.sql` | Load weekly marks per perkara for many people at once, with every row checked first. |
| `xlsx_to_import_marks.py` | Turn the old Excel workbooks into rows for `import_marks.sql`. |
| `schedule_photo_purge.sql` | One-time setup of the nightly photo purge. |
| `seed.sql` | Sample and workbook data for a fresh test database. **Never run on live.** |

---

## 12. Migration history

Run in this order. Each file explains itself in its opening comment.

| Migration | Change |
|---|---|
| `20260909010000_init` | The schema: tables, views, constraints. |
| `20260909010100_auth_bridge` | Links Supabase Auth to the staff directory; the security helpers. |
| `20260909010200_rls` | Row-level security: outlet scoping enforced by the database. |
| `20260909020000_return_submission_stage` | Store staff hand each return list to the clerk before Friday. |
| `20260909020100_return_kpi` | The store-staff returns KPI. |
| `20260909030000_tugasan_stays_with_area_manager` | Tugasan is the Area Manager's own self-check. |
| `20260909030100_returns_leave_admin` | Admin is taken out of returns. |
| `20260909030200_central_store_at_hq` | The store team works at HQ and sees every outlet's returns. |
| `20260909030300_grants` | Table privileges for signed-in users. |
| `20260909030400_real_branches` | The real outlet list. |
| `20260910010000_sv_checklist` | The 19-perkara Supervisor checklist. |
| `20260910010100_who_may_score` | One rule for who may score. |
| `20260910020000_return_photos` | Photo evidence on damage returns. |
| `20260910030000_mark_queries` | A question thread on a mark (removed 19 Sep). |
| `20260910030100_reminders` | Reminders from Area Manager to Supervisor. |
| `20260916010000_branch_staff_management` | Supervisors and Area Managers add their own staff. |
| `20260916020000_tighten_grants` | Grants brought back to what was intended. |
| `20260917010000_user_email` | A real e-mail per person, for password resets. |
| `20260917020000_set_my_email` | A person may update their own e-mail. |
| `20260917030000_service_role_reads_users` | The service role may read the directory (for `payroll-auth`). |
| `20260918010000_auto_provision_logins` | A login is created the moment a person is added. |
| `20260918020000_payroll_number_changes` | A payroll number can change; history follows it. |
| `20260918030000_manager_manages_outlets` | The Manager acts as an Area Manager over every outlet. |
| `20260918040000_report_views` | The `report_*` views for the reports app. |
| `20260919010000_payroll_number_shape` | Payroll numbers accept whatever payroll issues. |
| `20260919020000_marks_open_until_verified` | A mark can be changed until verified, then it is locked. |
| `20260919030000_drop_mark_queries` | The staff ↔ Supervisor question thread is removed. |
| `20260919040000_assets_for_every_outlet` | Every outlet gets the asset list. |
| `20260919050000_area_manager_hires_supervisors` | An Area Manager may add Supervisors too. |
| `20260919060000_label_spelling` | Two misspelt checklist labels corrected. |
| `20260919070000_supervisor_title` | SV vs Asisten Penyelia label. |
| `20260919080000_photo_files_leave_through_storage` | Photo files are removed through the Storage API. |
| `20261002010000_tugasan_read_by_managers` | Tugasan readable by those who fill or oversee it. |
| `20261002020000_report_form_from_marks` | A person-month is filed under the form they were marked on. |
| `20261002030000_rls_once_per_query` | Head-office access checked once per query (fixes report timeouts). |
| `20261002040000_due_from_join_week` | A new person is due from the week they were added. |
| `20261003010000_malaysia_date` | "Today" is Malaysia's date. |
| `20261003020000_handover_before_friday` | A return list before its Friday is not a missed hand-over. |
| `20261003030000_marked_before_added` | Someone marked before they were added is due all month. |
| `20261003040000_asset_issues` | Several open issues per asset, each resolved on its own. |
| `20261006010000_hr_administers` | HR has exactly Admin's rights; HR leaves returns. |

---

## Keeping this current

- **Tests.** `node supabase/tests/rls.test.mjs` applies every migration and the seed to a real Postgres and runs over 300 permission and report checks. Every new migration must be added to the lists in both `rls.test.mjs` and `gen_verify.mjs`.
- **Live check.** After adding a migration, run `node supabase/tests/gen_verify.mjs` to regenerate `verify_policies.sql`, then run that file on the live database.
- **This document.** Update the affected section and the migration history in the same change as the migration.
- `db/ERD.md` is the original design note from 9 Sep 2026. Its reasoning still holds, but this file is the current reference.
