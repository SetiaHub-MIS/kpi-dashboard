# Checklist Mingguan — Reporting Web App: Context Brief

Written 18 Sep 2026 for whoever designs the reporting web app. Everything here
is taken from the live schema and code, not from memory. The app to be
designed is **read-only**, **desktop-first**, for the **General Manager and
Human Resources**, and is a **second front end on the same Supabase back end**
as the existing phone app — not a second system.

---

## 1. What the system is

A Malaysian retail chain (head office "HQ Jenjarom"; ~40 outlets, each with a
short code such as `DMC`, `DKB`, `BKP`) marks its shop staff every week on a
paper checklist. Until September 2026 this lived in Excel workbooks, one per
outlet. **Checklist Mingguan** replaced them with:

- a Supabase project (Postgres + Auth + Edge Functions) holding all data;
- an Expo/React Native app (`marks-app/`, web build at
  https://kpi-dashboard-pied-mu.vercel.app) used on phones by supervisors,
  Area Managers, Managers, store staff and admin to **mark, verify, add staff,
  record returns**.

The reporting app takes the head-office *reading* out of the phone app: GM and
HR sign in there instead, see the company's numbers, filter, and download.
Nothing in the reporting app writes to the database.

**Language:** Bahasa Melayu is the primary language, English is a toggle. The
phone app keeps one dictionary with `ms`/`en` pairs per key; do the same.
Keep Malay labels the staff already know (`Pekerja Kedai`, `SV/AS`,
`Cawangan`, `Markah`, `Pulangan`, `Tugasan`).

**Constraints:** no budget (free tiers only), one-person maintenance, Vercel
hosting, Malaysia time (UTC+8). Keep the app small and self-contained.

---

## 2. Architecture and sign-in

```
 phone app (Expo)  ─┐
                    ├──►  Supabase: Postgres (RLS)  ·  Auth  ·  Edge Functions
 reports app (Vite)─┘            same project, same tables, same policies
```

- **Auth is by payroll number, not e-mail.** Users type e.g. `KP0093` and a
  password. Supabase Auth only knows e-mail addresses, so an Edge Function
  `payroll-auth` resolves the number to the login address server-side and
  returns a session. The browser never sees the address.

  ```ts
  // sign in
  const { data, error } = await supabase.functions.invoke('payroll-auth', {
    body: { action: 'sign-in', payrollId: 'HQ0130', password },
  });
  // data: { access_token, refresh_token }  |  401 { error: 'invalid_credentials' }
  await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  ```

  Use `@supabase/supabase-js` with `persistSession: true`, `autoRefreshToken:
  true`. Sign-out is `supabase.auth.signOut()`. No password reset in-app:
  forgotten passwords go to admin ("Sila hubungi Setiahub-MIS jika anda
  terlupa kata laluan.").

- **Who is signed in:** after `setSession`, read the directory row:
  `from('users').select('id, name, short_name, initials, role, branch_id').eq('auth_user_id', user.id).maybeSingle()`.
  The reports app should **refuse any role other than `general_manager`,
  `human_resources` (and, if wanted, `admin`)** with a plain message — RLS
  would still scope other roles correctly, but the app is not for them.

- **Row-level security does the scoping.** GM and HR are "cross-branch": every
  read of every table below returns every outlet. The app never needs a
  service-role key and must never ship one. All access is through the
  **anon key + the user's session JWT**.

- **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public values;
  the anon key is safe in a browser bundle).

- **Repo:** the reports app lives at `reports-web/` beside `marks-app/` and
  `supabase/` in the same repository; deployed as its own Vercel project with
  Root Directory `reports-web`.

---

## 3. Roles

`user_role` enum, nine values. Six are posted to an outlet, three see all:

| role | Malay label | posted to | acts / reads |
|---|---|---|---|
| `staff` | Pekerja Kedai | one outlet | marked weekly on the 22-perkara kedai form |
| `store` | Pekerja Stor | HQ | marked weekly on the 17-perkara stor form |
| `clerk` | Kerani Stor | HQ | owns supplier steps of a return |
| `supervisor` | SV/AS | one outlet | marks staff; is themselves marked on the SV form |
| `area_manager` | Area Manager | one or more outlets (`user_branches`) | marks SV/AS, verifies, Tugasan, reminders |
| `manager` | Manager | none (all outlets) | as Area Manager but company-wide; **blind to the stor side** (no returns, no stor marks) |
| `general_manager` | General Manager | none | reads everything — **reporting app user** |
| `human_resources` | Human Resources | none | reads everything — **reporting app user** |
| `admin` | Admin | none | user/branch administration, stays in the phone app |

Identity is the **payroll number** (`users.id`): two letters + four digits,
issued per outlet and position (`MC0001` DMC staff, `KP0001` BKP staff,
`HQ0130` head office, `WS0001` supervisor…). It can change on transfer;
history follows it. Always display it beside the name.

---

## 4. Domain concepts the reports rest on

**Period.** Marking is by **workbook week**: `period_year`, `period_month`
(1–12), `week_no` (1–4). These are *not* ISO weeks — every month has exactly
four marking weeks, matching the paper form. Only the returns KPI uses ISO
weeks (`iso_year`, `iso_week`) because its deadline rule is "the Friday of the
week it arrived".

**Forms.** `checklist_forms`: `kedai` (22 scorable lines, for `staff`), `stor`
(17 lines, for `store`), `sv` (19 lines, 17 usually applicable, for
`supervisor`). Each line is scored **1–5** (`scoring_rules.scale_max`,
5 everywhere today).

**A mark** (`marks`): one row per person per week. `total_score` and
`max_score` are the truth; **`pct` is a generated column** — always use it,
never recompute. `max_score` varies when lines are N/A. `branch_id` and
`form_key` are **snapshots** of where/how the person was scored at the time,
so past marks stay with the outlet they happened in even after a transfer.

**Pass.** `scoring_rules.pass_threshold` per branch (80 everywhere today):
`pct >= pass_threshold` is a pass. Join, don't hardcode 80.

**Verification.** `mark_verifications`: the manager's pass over a mark
(`verified_by`, `verified_at`, optional `adjusted_to` when they overrode the
total). Its **absence is meaningful** — in the old workbooks the "manager"
column was empty all year. Verification rate is a genuine management KPI.

**Coverage.** The view `mark_coverage` lists every active `staff`/`store`
person × week × period that exists in `marks`, with `is_gap = true` where no
mark was recorded. Unmarked weeks are the other genuine KPI (the workbooks'
`#DIV/0!` problem).

**Queries and reminders.** `mark_queries`: a short thread between the marked
person and their scorer over one week's mark (head office can read all).
`reminders`: nudges from an Area Manager to an SV/AS about unmarked crew.
Both are minor for reporting; "unanswered queries" could be a small tile.

**Tugasan.** Weekly per-outlet checks by the Area Manager:
`tugasan_items` (`peti_cash`, `x_report`), `tugasan_checks` (branch × period ×
week × item: `done`, `note`, `inspected_on`), `tugasan_signoffs` (branch ×
period × week: `filled_by`, `checked_by`, `signed_on`). `checked_by` empty =
same verification gap as marks.

**Pulangan (returns).** Goods returned from outlets to HQ store:
`returns` (`ref` PR0001, `branch_id`, `bill_no`, `bill_date`, `reason`
damage|expired, `disposition` supplier|discard, `supplier_id`) and
`return_events` (one row per stage reached: `received`, `submitted_to_clerk`,
`segregated`, `supplier_called` | `discarded`, `picked_up`, `adjusted`, each
with `occurred_on`). Three KPI rules, already expressed as views:

1. **Submission** — every list received is submitted to the kerani before the
   Friday on/after it arrived (`return_submission`, `return_submission_kpi`
   per branch × ISO week: `received_count`, `on_time_count`, `missing_count`,
   `pct`).
2. **Ageing** — no return open longer than 60 days (`return_ageing`:
   `age_days`, `status` = `cleared` | `ok` | `breach` | `overdue`).
3. **Grace** — past 60 days, one week to clear (`breach` → `overdue`).

Also `return_turnaround` (received → adjusted days) and `return_stage_gaps`
(days per hop, for bottleneck analysis). `assets` lists open physical issues
per outlet (`is_open`, `opened_on`).

---

## 5. Table reference (columns that matter for reporting)

```
branches            id (code) · name · short_name · active
users               id (payroll no.) · name · short_name · initials · role · branch_id · active · joined_on · email
user_branches       user_id · branch_id            -- extra outlets an Area Manager covers
scoring_rules       branch_id · pass_threshold · scale_max · verify_by_manager
checklist_forms     key · name · applies_to (role)
checklist_categories id · form_key · position · name
checklist_lines     id · category_id · position · label
marks               id · user_id · branch_id · form_key · period_year · period_month · week_no
                    · total_score · max_score · pct (generated) · note · scored_by · scored_at
mark_lines          mark_id · line_id · score       -- per-perkara detail (absent for imported marks)
mark_verifications  mark_id · verified_by · verified_at · adjusted_to
mark_queries        id · mark_id · sender_id · body · created_at
reminders           id · branch_id · recipient_id · sent_by · message · created_at · read_at
tugasan_items       key · label · note_kind · position
tugasan_checks      branch_id · period_year · period_month · week_no · item_key · done · note · inspected_on
tugasan_signoffs    branch_id · period_year · period_month · week_no · filled_by · checked_by · signed_on
assets              id · branch_id · name · is_open · note · opened_on · resolved_on
suppliers           id · name · phone · active
returns             id · ref · branch_id · bill_no · bill_date · reason · remark · supplier_id · disposition · created_by · created_at
return_events       id · return_id · stage · occurred_on · recorded_by
return_photos       (photo references per return; storage bucket)
role_changes        user_id · from_role · to_role · changed_by · changed_at      -- admin-only
branch_changes      user_id · from_branch_id · to_branch_id · changed_by · changed_at
payroll_id_changes  user_id · from_id · to_id · changed_by · changed_at
```

Existing views (all `security_invoker`, i.e. RLS applies): `mark_coverage`,
`return_turnaround`, `return_stage_gaps`, `return_submission`,
`return_submission_kpi`, `return_ageing`.

Not readable by the app, by design: `login_settings`.

---

## 6. The data contract for the reports app (built: `20260918040000_report_views.sql`)

To keep both apps quoting the same numbers, the reporting app reads
**`report_*` views** rather than assembling aggregates in the browser. They
exist as of 18 Sep 2026, are `security_invoker` like every other view, and
are asserted by `npm run test:rls`. The shapes below are what the database
returns; the original design shapes gained a few columns while being built,
each noted.

```
report_periods
  period_year · period_month · period_end · due_weeks
  -- every month from the first with anything recorded to the current one
  -- (Malaysia time); due_weeks = checklist weeks that have started, 0–4

report_marks
  mark_id · user_id · branch_id · form_key · period_year · period_month · week_no
  · total_score · max_score · pct · adjusted_to · final_pct · pass_threshold
  · is_pass · is_verified · verified_by · verified_at · scored_by · scored_at · note
  -- one row per mark with the pass rule applied. final_pct is what the
  -- phone app shows: the manager's adjusted total when there is one

report_branch_weekly
  branch_id · branch_name · branch_short · period_year · period_month · week_no
  · form_key · week_due · headcount · marked · gaps · passed · avg_pct
  · pct_sum · verified · pass_threshold
  -- headcount = active people posted here, due this month; marked = marks
  -- scored here (the snapshot); gaps = due people with no mark that week;
  -- avg_pct NULL when nothing was marked; pct_sum is for re-aggregation

report_branch_monthly
  branch_id · branch_name · branch_short · period_year · period_month · form_key
  · headcount · marked · gaps · passed · avg_pct · pct_sum · verified
  · pass_threshold · due_weeks · pass_rate_pct · verified_pct · coverage_pct
  -- gaps and coverage are over weeks that have started:
  -- coverage_pct = (headcount × due_weeks − gaps) / (headcount × due_weeks)

report_company_weekly
  period_year · period_month · week_no · form_key · week_due
  · headcount · marked · gaps · passed · avg_pct · pct_sum · verified
  · pass_rate_pct · verified_pct · coverage_pct

report_company_monthly
  period_year · period_month · form_key
  · headcount · marked · gaps · passed · avg_pct · pct_sum · verified · due_weeks
  · pass_rate_pct · verified_pct · coverage_pct

report_staff_monthly
  user_id · name · short_name · role · form_key · branch_id · branch_name
  · branch_short · active · period_year · period_month · due_weeks
  · w1_pct · w2_pct · w3_pct · w4_pct (NULL = unmarked) · avg_pct
  · marked_weeks · passed_weeks · verified_weeks · pass_threshold · marked_at
  · rank_in_branch
  -- outlet and role are the person's current ones; marked_at is where the
  -- marks were scored; equal averages share a rank

report_returns_branch_monthly
  branch_id · branch_name · branch_short · year · month
  · received · submitted_on_time · not_submitted · submission_pct
  · open · breach · overdue · avg_turnaround_days
  -- by the calendar month a list was received in; ageing as of today

report_returns_open
  id · ref · branch_id · branch_name · branch_short · bill_no · bill_date
  · reason · disposition · supplier_name · received_on · age_days · limit_on
  · clear_by · status (ok | breach | overdue) · last_stage · last_stage_on
  -- every return not yet adjusted; the breach/overdue list is a filter on status

report_tugasan_branch_monthly
  branch_id · branch_name · branch_short · period_year · period_month · due_weeks
  · weeks_filled · weeks_checked · items_done · items_per_week · items_total
  -- HQ Jenjarom has no Area Manager, so its row is always empty
```

Definitions settled while building (the migration header carries the same
list): a person is **due** a mark when active, posted to an outlet, on a role
with a form, and joined by the month's end — or marked in that month, whatever
`joined_on` says; a **week is due** once it has started; **marked** counts
where the mark was scored, **gaps** where the person is posted now; the score
judged is the **adjusted** one when a manager adjusted it (that is what the
phone app shows); **verified** is the existence of a `mark_verifications`
row. `scoring_rules` now has a row for every branch (backfilled, and a
trigger adds one for any new branch), so no report falls back to a constant
threshold.

Filters every report needs: **year, month** (default: current), **outlet**
(multi-select, default all), **form/role** (kedai / stor / SV), and for the
staff table **search by name or payroll number**. Trend charts can read
`report_company_monthly` directly, or sum `report_branch_monthly` rows when
an outlet filter applies — every view carries `pct_sum` so an average
re-derived from summed rows equals the database's own. Sum counts; never
average percentages across rows.

---

## 7. Downloads

- An Edge Function **`xlsx-export`** already exists: `POST` with the user's
  JWT and body `{ year, month }` returns an `.xlsx` (sheet `Markah`: one row
  per person × week for everything the caller may see). Reuse it for the
  "download this month" button, or generate XLSX/CSV client-side from the
  report views (SheetJS/`xlsx` works in the browser) for filtered tables.
- Every table view should have a download of exactly what is on screen.

---

## 8. v1 report list

Agreed starting point — three pages plus a landing dashboard:

1. **Dashboard (landing).** This month at a glance: company pass rate, coverage
   (marked / due), verification rate, returns on-time %, returns overdue count;
   a 6–12 month trend of pass rate and coverage; outlets ranked by pass rate
   with their coverage beside it (a high pass rate on low coverage is the
   classic false comfort — show both).
2. **Outlets (Cawangan).** One row per outlet per month: headcount, marked,
   gaps, pass rate, avg %, verified %, tugasan filled/checked. Click-through to
   the outlet's weekly grid and its staff.
3. **Staff (Pekerja).** Ranking table: name · payroll no. · outlet · role ·
   W1–W4 % · avg · passed weeks · verified. Filters above. Download.
4. **Pulangan (returns).** Submission KPI per outlet, ageing status counts,
   list of `breach`/`overdue` returns with days open and supplier.

Worth considering for v1.5: unmarked-week list (who was not marked, by outlet,
by week — the thing head office most wants to chase), unanswered queries,
open assets per outlet, and the audit trails (role/branch/payroll changes)
for HR.

---

## 9. Things to get right

- **Use `pct` and `pass_threshold` from the database.** Do not divide
  `total_score/max_score` in the browser or assume 80.
- **Weeks are workbook weeks 1–4, not calendar weeks** — label them
  `Minggu 1`…`Minggu 4` of a month. Returns KPI is the one ISO-week series.
- **Snapshots:** a mark's `branch_id` is where it was scored, which may differ
  from the person's current `users.branch_id`. Outlet reports must group by
  `marks.branch_id`; the staff table shows the person's *current* outlet.
- **Inactive people** (`users.active = false`) keep their history; exclude
  them from headcount and coverage denominators, include their past marks.
- **Manager is blind to the stor side by RLS**; GM/HR are not. If admin is
  ever let into the reports app, everything is visible to them too.
- **Numbers, not names, are permanent** — but payroll numbers can now change.
  Key React lists on `users.id` and expect it to differ between months only
  through `payroll_id_changes`; don't cache a number → person map across
  sessions.
- **Empty states are data.** A blank week is a coverage gap, an absent
  verification is an unverified mark — both are findings to display, not
  rows to hide.
- **Malay first.** Every label has an `ms` and an `en`; default `ms`; the
  toggle persists in `localStorage`.

---

## 10. What the reports app does not do

No marking, verifying, adding people, editing anything, password resets, or
push notifications. No service-role key. No second copy of the business rules
— thresholds and KPI rules live in Postgres functions/views and the app
displays their output.
