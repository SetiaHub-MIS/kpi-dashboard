import { Branch } from '@/data/branches';
import { FORMS } from '@/data/checklist';
import { Role, User } from '@/data/users';
import { supabase } from '@/lib/supabase';

/**
 * Reads the staff directory out of Postgres in the shape the app's stores
 * already use, so screens do not change when the data stops being a fixture.
 *
 * Every query here runs under the caller's own RLS policies. A supervisor
 * fetching users gets their branch and no other — the filtering is the
 * database's, not ours, which is the whole point of Sprint 1.
 */

/** Column list kept in one place so the row type and the select cannot drift. */
const USER_COLUMNS = 'id, name, short_name, initials, role, branch_id, active';

export async function fetchBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, short_name, active')
    .order('id');

  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    short: b.short_name,
    active: b.active,
  }));
}

/**
 * The four weekly percentages the app hangs off each person, and their
 * per-kategori averages.
 *
 * These live on `User` because the marking screens were written against a
 * fixture that embedded them. Marks move onto Supabase properly in Sprint 2;
 * until then they are read here so the grids keep working, rather than every
 * screen going blank the moment the directory becomes real.
 */
type MarkRow = {
  user_id: string;
  week_no: number;
  pct: number;
  form_key: string;
};

export async function fetchStaff(period: { year: number; month: number }): Promise<User[]> {
  const [{ data: users, error: userErr }, { data: marks, error: markErr }] =
    await Promise.all([
      supabase.from('users').select(USER_COLUMNS).order('id'),
      supabase
        .from('marks')
        .select('user_id, week_no, pct, form_key')
        .eq('period_year', period.year)
        .eq('period_month', period.month),
    ]);

  if (userErr) throw userErr;
  if (markErr) throw markErr;

  const byUser = new Map<string, MarkRow[]>();
  (marks ?? []).forEach((m) => {
    const rows = byUser.get(m.user_id) ?? [];
    rows.push(m as MarkRow);
    byUser.set(m.user_id, rows);
  });

  return (users ?? []).map((u) => {
    const mine = byUser.get(u.id) ?? [];
    const w: (number | null)[] = [null, null, null, null];
    mine.forEach((m) => {
      if (m.week_no >= 1 && m.week_no <= 4) w[m.week_no - 1] = m.pct;
    });

    return {
      id: u.id,
      name: u.name,
      short: u.short_name,
      init: u.initials,
      role: u.role as Role,
      branchId: u.branch_id,
      active: u.active,
      w,
      // Per-kategori averages need mark_lines joined through to categories,
      // which is Sprint 2's query. Zeroes render as "no data" rather than as a
      // wrong number, which is the safer of the two while this is unfinished.
      perkara: emptyPerkara(u.role as Role),
    };
  });
}

const emptyPerkara = (role: Role): number[] =>
  FORMS[role === 'store' ? 'stor' : 'kedai'].map(() => 0);

/** Extra outlets each Area Manager covers, keyed by payroll number. */
export async function fetchUserBranches(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('user_branches')
    .select('user_id, branch_id');

  if (error) throw error;

  const out: Record<string, string[]> = {};
  (data ?? []).forEach((r) => {
    out[r.user_id] = [...(out[r.user_id] ?? []), r.branch_id];
  });
  return out;
}

/** Everything the directory needs, in one round of queries. */
export async function fetchDirectory(period: { year: number; month: number }) {
  const [branches, staff, extraBranches] = await Promise.all([
    fetchBranches(),
    fetchStaff(period),
    fetchUserBranches(),
  ]);

  return {
    branches,
    users: staff.map((u) =>
      extraBranches[u.id] ? { ...u, branchIds: extraBranches[u.id] } : u
    ),
  };
}
