# Checklist Mingguan — data model

PostgreSQL 15+ (Supabase). Migrations run in filename order:

```
supabase/migrations/20260909010000_init.sql          tables, views, constraints
supabase/migrations/20260909010100_auth_bridge.sql   auth.users link + RLS helpers
supabase/migrations/20260909010200_rls.sql           policies
supabase/seed.sql                                    workbook data
```

```bash
supabase db push          # or: supabase db reset  (applies migrations + seed)
npm run test:rls          # proves the policies actually scope
```

Every file is executed against a real Postgres engine (PGlite) by
`supabase/tests/rls.test.mjs` before being committed — 17 assertions covering
branch reads, the negative cases, view scoping and write permissions.

15+ rather than 14+ because the views are marked `security_invoker`, which
Postgres added in 15. Without it a view runs as its owner and quietly bypasses
every policy below.

## Shape

```
branches ──┬─< users ──┬─< role_changes
           │           └─< branch_changes
           ├─< scoring_rules (1:1)
           ├─< assets
           ├─< tugasan_checks      >── tugasan_items
           ├─< tugasan_signoffs
           ├─< marks ──┬─< mark_lines      >── checklist_lines
           │           └─── mark_verifications (1:1)
           └─< returns ─< return_events
                  └──> suppliers

checklist_forms ─< checklist_categories ─< checklist_lines
```

## Tables

| Table | Holds |
|---|---|
| `branches` | Outlets. Short code (`MCG`) is the primary key and is permanent. |
| `users` | Every account. `role` and `branch_id` are mutable; `id` (payroll no.) is not. |
| `role_changes`, `branch_changes` | Audit of promotions, demotions, transfers. |
| `checklist_forms` / `_categories` / `_lines` | Reference data. 22 lines for `kedai`, 17 for `stor`. |
| `scoring_rules` | Pass threshold, 1–5 vs 1–10 scale, whether manager verification is required. Per branch. |
| `marks` | One weekly score per person. |
| `mark_lines` | Per-perkara detail for marks captured in-app. |
| `mark_verifications` | The manager pass. Absence is the signal. |
| `tugasan_items` / `_checks` / `_signoffs` | Area Manager's own weekly self-check, per branch × month × week. |
| `assets` | Checklist Kedai asset log, per branch. |
| `suppliers`, `returns`, `return_events` | The returns workflow and its stage timeline. |

## Decisions worth knowing

**Marks snapshot their context.** `marks.branch_id` and `marks.form_key` are
denormalised rather than joined through `users`. People transfer branches and
change roles; a mark must stay attached to the branch and form it was actually
scored under, or historical reports silently rewrite themselves.

**Percentages are never stored as input.** `marks.pct` is a generated column
over `total_score / max_score`, so a score can't disagree with its own lines.
This is the fix for the workbook's core defect, where a percentage cell could
outlive the numbers behind it.

**Ageing is derived, never stored.** `return_events` records what happened and
when; `return_turnaround` and `return_stage_gaps` compute the rest. The app's
`"34 hari terbuka"` strings become `now() - opened_on`.

**`return_stage_gaps` orders by chain position, not date.** Two stages recorded
on the same day must still read forwards — ordering by date alone produced a
`supplier_called → segregated` row, which is impossible.

**Missing rows are meaningful.** `mark_coverage` exposes the person × week cells
with no mark — the `#DIV/0!` problem stated as a query. On the seed it returns
32 gaps of 44 cells for Machang and 12 of 16 for Kota Bharu, matching the app.

## Branch scoping, and why the helpers exist

Scoping is enforced by RLS, not by the client. A supervisor querying another
outlet gets zero rows rather than a filtered view of someone else's data.

The rules: **admin** is cross-branch; **everyone else** is confined to their own
`branch_id`; **reference tables** (forms, kategori, perkara, suppliers) are
readable by any signed-in user and written by admin.

The `SECURITY DEFINER` helpers in the auth-bridge migration are not decoration.
Branch scoping needs the caller's `branch_id`, which lives in `users` — the very
table the policy guards. A policy that reads `users` directly re-enters its own
policy and the table locks up under itself. `SECURITY DEFINER` runs that one
lookup outside RLS and cuts the loop. Their `search_path` is pinned, because a
definer function resolving names against the caller's path is an escalation
route.

Every scoped policy calls one predicate, `app_can_see_branch(text)`. Change the
scoping rule there rather than in twenty policies.

Two things worth remembering:

- **Permissive RLS fails silently.** Get it wrong and queries still return rows,
  just the wrong ones. That is why the test suite asserts what each role
  *cannot* read, not only what it can.
- **Stage ownership is not a security boundary.** Which of store or clerk
  records which step of a return stays in the app; the database enforces branch
  and role, which is what actually protects data.

## Store → table mapping

| Zustand store | Becomes |
|---|---|
| `useUsers` | `users`, `role_changes`, `branch_changes` |
| `useBranches` | `branches` |
| `useMarks` (settings) | `scoring_rules` |
| `useMarks` (submitted, notes, verified) | `marks`, `mark_lines`, `mark_verifications` |
| `useTugasan` | `tugasan_checks`, `tugasan_signoffs` |
| `useReturns` | `returns`, `return_events`, `suppliers` |
| `useSession` | Auth — not persisted here |
| `FORM` / `STOR_FORM` consts | `checklist_forms` / `_categories` / `_lines` |
| `ASSETS` const | `assets` |

`useMarks.draft` is deliberately absent — an in-progress checklist is client
state until submitted. If drafts need to survive a reinstall, add a
`mark_drafts` table keyed by `(user_id, scored_by)`.

## Seed provenance

Rows are commented `REAL` or `NEW` in `0002_seed.sql`.

**Real**, from the workbooks: both branches' names are real for Machang only;
the 8 KP/MY staff; supervisors WS0001 and WS0012; the 22-perkara kedai form
verbatim; September's weekly percentages; the three manager verifications; the
August TUGASAN block including its blank week-4 date and empty `checked_by`;
Machang's asset log.

**Invented**, replace before going live: the Kota Bharu branch and its people;
the 17-perkara store checklist; the store and clerk roles' staff; the admin
account; `AM0001`/`AM0002` numbers (Herdi is named in the workbook but never
numbered); the entire returns dataset.

One rounding note: the workbooks stored weekly *percentages*, this schema stores
*totals*. Where a total cannot express the original percentage exactly — 83% of
85 is unreachable — the generated `pct` lands within a point.
