import { Branch } from '@/data/branches';
import { FORMS } from '@/data/checklist';
import { Role, User } from '@/data/users';
import { MarkRow, fetchMarks, fetchPerkaraAverages } from '@/lib/marks';
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
 * The four weekly percentages the app hangs off each person, plus their
 * per-kategori averages.
 *
 * These live on `User` because the marking screens were written against a
 * fixture that embedded them. Both now come from Postgres — the averages need
 * mark_lines joined back through categories, which is why they were zeroes
 * until the marks layer existed.
 */
export async function fetchStaff(
  period: { year: number; month: number },
  scaleMax = 5
): Promise<{
  users: User[];
  markIds: Record<string, number>;
  verified: Record<string, boolean>;
  notes: Record<string, string>;
}> {
  const [{ data: users, error: userErr }, marks, perkara] = await Promise.all([
    supabase.from('users').select(USER_COLUMNS).order('id'),
    fetchMarks(period),
    fetchPerkaraAverages(period, scaleMax),
  ]);

  if (userErr) throw userErr;

  const byUser = new Map<string, MarkRow[]>();
  marks.forEach((m) => {
    byUser.set(m.userId, [...(byUser.get(m.userId) ?? []), m]);
  });

  // marks.id per person-week, so a manager verifying a mark knows which row,
  // and which of them the manager has already signed off.
  const markIds: Record<string, number> = {};
  const verified: Record<string, boolean> = {};
  const notes: Record<string, string> = {};
  marks.forEach((m) => {
    const key = `${m.userId}-${m.weekNo - 1}`;
    markIds[key] = m.id;
    if (m.verified) verified[key] = true;
    if (m.note) notes[key] = m.note;
  });

  return {
    verified,
    notes,
    users: (users ?? []).map((u) => {
      const mine = byUser.get(u.id) ?? [];
      const w: (number | null)[] = [null, null, null, null];
      mine.forEach((m) => {
        if (m.weekNo >= 1 && m.weekNo <= 4) w[m.weekNo - 1] = m.pct;
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
        perkara: perkara[u.id] ?? emptyPerkara(u.role as Role),
      };
    }),
    markIds,
  };
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
export async function fetchDirectory(
  period: { year: number; month: number },
  scaleMax = 5
) {
  const [branches, staff, extraBranches] = await Promise.all([
    fetchBranches(),
    fetchStaff(period, scaleMax),
    fetchUserBranches(),
  ]);

  return {
    branches,
    users: staff.users.map((u) =>
      extraBranches[u.id] ? { ...u, branchIds: extraBranches[u.id] } : u
    ),
    markIds: staff.markIds,
    verified: staff.verified,
    notes: staff.notes,
  };
}
