# 2026 marks history import — handoff for the reporting web app

Companion to `docs/reports-web-brief.md`. On 2 October 2026 the paper-era
checklist workbooks for January–September 2026 were imported into the live
Supabase database. The reports app now has nine months of history to show.
This note says what is in the data, how it got there, and what that means for
the numbers the `report_*` views return.

---

## 1. What is now in the database

| | Staff (pekerja kedai) | Supervisors (SV/AS) |
|---|---|---|
| Form (`marks.form_key`) | `kedai` — 22 perkara | `sv` — 19 perkara |
| Source | 36 outlet workbooks `*-STAFF-2026.xlsx` | 37 outlet workbooks `*-SUPV-2026.xlsx` |
| Period | Jan–Sep 2026, weeks 1–4 | Jan–Sep 2026, weeks 1–4 |
| Week-marks imported | 6,411 | 931 |
| People | 249 | 55 |
| Scored by | the outlet's SV/AS | an Area Manager |
| Average score | ~77–78% | ~79% |

Week-marks per month:

| | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep |
|---|---|---|---|---|---|---|---|---|---|
| Staff | 608 | 618 | 637 | 655 | 695 | 780 | 786 | 839 | 793 |
| SV/AS | 99 | 84 | 79 | 116 | 106 | 135 | 90 | 159 | 63 |

These are the counts in the import files. A week that was already in the
database (marked in the phone app) was **kept as it was** and the workbook's
version skipped, so live totals per month can differ by a handful. The live
figures are what the views return; to see them:

```sql
SELECT form_key, period_month, count(*) AS marks, round(avg(pct)) AS avg_pct
  FROM marks WHERE period_year = 2026 AND period_month <= 9
 GROUP BY 1, 2 ORDER BY 1, 2;
```

Every imported mark is a normal row: `marks` (total, max, generated `pct`,
`note`, `scored_by`) plus one `mark_lines` row per scored perkara. Nothing
about an imported mark is special in the schema — the views treat it exactly
like an app-entered one. October 2026 onwards comes from the phone app only.

## 2. How the numbers were made (and checked)

- **Scores are per perkara, as on the sheet.** Total and maximum are summed
  from the perkara, never copied from the workbook's JUMLAH cell.
- **Blank or N/A perkara are left out of the maximum**, so `max_score` varies
  week to week (kedai is 110 only when all 22 are scored; SV is typically 85
  because two of its 19 lines are usually N/A). Always use `pct`.
- **Agreement with the workbooks:** every week was compared with the sheet's
  own JUMLAH MARKAH. Staff: ~98% identical; SV: 913 of 960 identical. The
  rest are explained and the database is the correct figure:
  - a score typed somewhere that is no perkara — on a heading row, on a
    CATATAN (note) row under an already-scored line, or on a row someone
    added that is not on the form ("E) ORDER BARANG", "hostel kurang
    bersih"). The workbook's `=SUM()` counts these; the import does not.
  - workbook formula errors: a `SUM` range that skips a row after a row was
    inserted (about a dozen staff weeks), or junk such as `444444` typed on
    a heading.
- **Hand-entry slips were repaired, not guessed:** a score typed one row low
  under a blank perkara was given to that perkara; a perkara whose label was
  erased kept its scores; stray rows with no scores were dropped. Every such
  decision is listed in the notes files beside the workbooks.
- **Month** is the block's "MONTH: …" label; **week** is the WEEK 1–4 column.
  The TARIKH dates were not used (typo-prone; one outlet fills its blocks a
  month behind). October was left out for that reason.
- **CATATAN text** is in `marks.note` as `KATEGORI: text; …`.

## 3. What this means for the reports

1. **Verified % is ~0 for January–September.** No Area Manager confirmation
   (`mark_verifications`) was imported — the business chose to keep imported
   weeks open. The workbooks' MANAGER column was mostly empty or a comment.
   For 2026 history, label verification "not recorded before the app" rather
   than presenting 0% as a finding. Verification is real from the phone app
   onwards.
2. **`final_pct` = `pct` for imported weeks** — no adjusted totals exist.
3. **Coverage/gaps for past months may be under-counted.** `report_due`
   treats a person as due in a month if they had joined by its end *or* were
   marked in it, and `users.joined_on` defaults to the day the row was
   created. Anyone whose row was created after a month — with **no** mark in
   that month — is not counted as due in it, so the month shows no gap for
   them and its coverage % reads higher than it really was. Marks, averages
   and pass rates are exact. Check how recent `joined_on` is before trusting
   coverage before October:

   ```sql
   SELECT date_trunc('month', joined_on)::date AS joined, count(*)
     FROM users WHERE role IN ('staff', 'supervisor') GROUP BY 1 ORDER BY 1;
   ```

   If most rows are recent, label pre-October coverage as approximate (or
   have real join dates set on `users.joined_on`).
4. **Outlet = where the person is posted now.** `marks.branch_id` was set to
   each person's outlet at import time. Someone who transferred during 2026
   has their earlier weeks filed under their current outlet. (App-entered
   marks snapshot the outlet at scoring time as before.)
5. **Two cohorts, never blended.** Staff marks are `kedai`, SV/AS marks are
   `sv`; report them side by side, as the brief says.
6. **One mark per person per week.** Three people were promoted from staff
   to SV/AS during the year (KK0005, KM0010, PM0029). Their staff-period
   weeks are `kedai` marks; where a week had both a staff and an SV sheet,
   the staff mark was kept. So a current supervisor can legitimately have
   `kedai` marks in their history — group by `marks.form_key`, not by the
   person's current role. The report views do this since
   `20261002020000_report_form_from_marks.sql`: `report_due` and
   `report_staff_monthly` file each month under the form the person was
   marked on.
7. **`scored_by`:**
   - a payroll number for 6,123 staff weeks and 901 SV weeks;
   - **NULL for 288 staff weeks and 30 SV weeks** — no scorer was recorded
     on the sheet (blank NAMA, or a scorer the business could not identify).
     Show "—", not a guess. (The phone app's week screen falls back to the
     current supervisor's name for these; the reports app should not.)
   - the scorer can be an **inactive** user (two resigned supervisors were
     added inactive so their weeks are attributed), an **Area Manager posted
     at HQ** (the `HQ0xxx` numbers score SV/AS weeks), someone **posted at
     another outlet** (people moved), or occasionally a **staff member who
     covered** for the supervisor. Resolve names through `users` without
     filtering on `active`.
8. **Inactive people keep their marks** and drop out of denominators — as
   the brief already says; the import relies on it.

## 4. Other changes made the same day

- **Tugasan read access tightened** (`20261002010000_tugasan_read_by_managers.sql`,
  applied live, `verify_policies.sql` all PASS). `tugasan_checks` and
  `tugasan_signoffs` are now readable only by Area Managers/Managers (for the
  outlets they reach) and by GM, HR and admin; staff and SV/AS at the outlet
  can no longer read them. `report_tugasan_branch_monthly` is unchanged for
  GM/HR, who still see every outlet.
- **Phone app:** each role's section (`/manager`, `/admin`, `/supervisor`,
  `/staff`, `/pulangan`) now opens only for its own roles. No effect on the
  reports app.

## 5. Re-running or adding months (for whoever maintains the data)

- Converter: `supabase/xlsx_to_import_marks.py` (reads the workbooks, writes
  SQL); importer: `supabase/import_marks.sql` (all the checks; `keep` mode
  never overwrites a week already in the database).
- Typical run, from the repo root:

  ```
  python supabase\xlsx_to_import_marks.py "<folder of workbooks>" --until 2026-09 --split-months --check-file --scorer-ids "<filled scorer_ids.xlsx>" -o "<folder>\import_marks.sql"
  ```

  Run the `_check.sql` file first (it lists every problem and saves
  nothing), then the import file(s). The Supabase SQL editor refuses files
  much over 1 MB, hence `--split-months`. For a second form whose people
  also appear in an earlier import, add `--skip-weeks-of "<earlier files>"`.
- Scorers: `--scorer-list` writes a spreadsheet of every scorer name per
  workbook; fill its `payroll_id` column (`-` = no scorer) and pass it back
  with `--scorer-ids`. A payroll number is followed as given; a name is the
  fallback, matched among the scorers at the person's outlet.
