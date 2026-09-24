import { Branch } from '@/data/branches';
import { FORMS } from '@/data/checklist';
import { Role, SupervisorTitle, User } from '@/data/users';
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
const USER_COLUMNS = 'id, name, short_name, initials, role, branch_id, email, active, supervisor_title';

const UNIQUE_VIOLATION = '23505';
const RLS_REFUSED = '42501';
const CHECK_VIOLATION = '23514';

export type CreateUserResult =
  /** `coverageError` is set when the person exists but their extra outlets did not save. */
  | { ok: true; coverageError?: string }
  | { ok: false; reason: 'duplicate' | 'forbidden' | 'unknown'; message: string };

/**
 * Adds one person to the directory. Who may do this is the database's call:
 * admin anywhere, an SV/AS or Area Manager only for pekerja kedai at an outlet
 * they cover (users_insert_branch_staff). A refusal comes back as 'forbidden'
 * rather than a thrown error, because it is an answer, not a fault.
 *
 * 'duplicate' matters more than it looks. A supervisor's copy of the
 * directory is their own branch, so the app cannot know a payroll number is
 * taken at another outlet — only the primary key can.
 *
 * An Area Manager's extra outlets go into user_branches once the row exists.
 * That second write cannot share the first's transaction from here, so if it
 * fails the person is still created and the caller is told — retrying the
 * whole thing would only hit 'duplicate'.
 */
export async function createUser(
  user: Pick<User, 'id' | 'name' | 'short' | 'init' | 'role' | 'branchId' | 'email' | 'supervisorTitle'>,
  extraBranchIds: string[] = []
): Promise<CreateUserResult> {
  const { error } = await supabase.from('users').insert({
    id: user.id,
    name: user.name,
    short_name: user.short,
    initials: user.init,
    role: user.role,
    branch_id: user.branchId,
    email: user.email ?? null,
    supervisor_title: user.role === 'supervisor' ? (user.supervisorTitle ?? null) : null,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate', message: error.message };
    if (error.code === RLS_REFUSED) return { ok: false, reason: 'forbidden', message: error.message };
    // The table refusing the row itself — in practice the payroll-number
    // shape check, when the database is behind the app on that rule.
    if (error.code === CHECK_VIOLATION) {
      return { ok: false, reason: 'unknown', message: `Pangkalan data menolak nombor pekerja ${user.id}: ${error.message}` };
    }
    return { ok: false, reason: 'unknown', message: error.message };
  }

  if (extraBranchIds.length === 0) return { ok: true };

  const { error: coverageErr } = await supabase
    .from('user_branches')
    .insert(extraBranchIds.map((branchId) => ({ user_id: user.id, branch_id: branchId })));

  return coverageErr ? { ok: true, coverageError: coverageErr.message } : { ok: true };
}

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: 'forbidden' | 'unknown'; message: string };

const asResult = (error: { code?: string; message: string } | null): WriteResult =>
  !error
    ? { ok: true }
    : { ok: false, reason: error.code === RLS_REFUSED ? 'forbidden' : 'unknown', message: error.message };

/**
 * Replaces an Area Manager's extra outlets wholesale. Rows in user_branches
 * are what app_can_see_branch() reads, and nothing in the database prunes
 * them when a role changes — the trigger guards writes *to* the table, not
 * the role on the person — so every caller that can change a role must call
 * this, with an empty list, or a demoted Area Manager keeps reaching outlets
 * they no longer cover.
 */
async function replaceCoverage(userId: string, extraBranchIds: string[]): Promise<WriteResult> {
  const { error: delErr } = await supabase.from('user_branches').delete().eq('user_id', userId);
  if (delErr) return asResult(delErr);
  if (extraBranchIds.length === 0) return { ok: true };
  const { error } = await supabase
    .from('user_branches')
    .insert(extraBranchIds.map((branchId) => ({ user_id: userId, branch_id: branchId })));
  return asResult(error);
}

/** A promotion, demotion or transfer, with the audit row the schema keeps for it. */
export async function updateUserRole(input: {
  id: string;
  from: Role;
  to: Role;
  branchId: string | null;
  extraBranchIds: string[];
  changedBy: string | null;
}): Promise<WriteResult> {
  // A title only means anything on 'supervisor' — the table's own CHECK
  // enforces this, so moving someone off the role has to clear it in the
  // same statement or the database refuses the whole role change.
  const patch: Record<string, unknown> = { role: input.to, branch_id: input.branchId };
  if (input.to !== 'supervisor') patch.supervisor_title = null;

  const { error } = await supabase.from('users').update(patch).eq('id', input.id);
  if (error) return asResult(error);

  // After the role update: the trigger only admits extra outlets for an
  // area_manager, so a promotion into that role has to land first.
  const coverage = await replaceCoverage(input.id, input.extraBranchIds);
  if (!coverage.ok) return coverage;

  const { error: auditErr } = await supabase.from('role_changes').insert({
    user_id: input.id,
    from_role: input.from,
    to_role: input.to,
    changed_by: input.changedBy,
  });
  return asResult(auditErr);
}

/** Moves a person's home outlet and/or the extra outlets an Area Manager covers. */
export async function updateUserPosting(input: {
  id: string;
  fromBranchId: string | null;
  branchId: string | null;
  extraBranchIds: string[];
  changedBy: string | null;
}): Promise<WriteResult> {
  const { error } = await supabase
    .from('users')
    .update({ branch_id: input.branchId })
    .eq('id', input.id);
  if (error) return asResult(error);

  const coverage = await replaceCoverage(input.id, input.extraBranchIds);
  if (!coverage.ok) return coverage;

  if (input.fromBranchId === input.branchId) return { ok: true };
  const { error: auditErr } = await supabase.from('branch_changes').insert({
    user_id: input.id,
    from_branch_id: input.fromBranchId,
    to_branch_id: input.branchId,
    changed_by: input.changedBy,
  });
  return asResult(auditErr);
}

/**
 * A corrected or changed name. The short form used on cards is derived from
 * the full name; the initials are the admin's to set, since a derived pair
 * is often wrong for a Malay name (bin/binti) or a one-word one.
 */
export async function updateUserName(input: {
  id: string;
  name: string;
  short: string;
  init: string;
}): Promise<WriteResult> {
  const { error } = await supabase
    .from('users')
    .update({ name: input.name, short_name: input.short, initials: input.init })
    .eq('id', input.id);
  return asResult(error);
}

export async function updateUserActive(id: string, active: boolean): Promise<WriteResult> {
  const { error } = await supabase.from('users').update({ active }).eq('id', id);
  return asResult(error);
}

/**
 * Records or clears the real address. The database keeps the login's address
 * in step (users_sync_auth_email), so a reset link goes to the right place
 * from the moment this returns. A duplicate is the table's answer, not ours.
 */
export async function updateUserEmail(id: string, email: string | null): Promise<WriteResult> {
  const { error } = await supabase.from('users').update({ email }).eq('id', id);
  if (error?.code === UNIQUE_VIOLATION) {
    return { ok: false, reason: 'unknown', message: 'E-mel ini sudah digunakan oleh akaun lain.' };
  }
  return asResult(error);
}

/**
 * The signed-in person's own address, through set_my_email() — the one
 * write a non-admin may make to users. The table's format check and unique
 * index answer for bad input; both are turned into words here.
 */
export async function updateMyEmail(email: string | null): Promise<WriteResult> {
  const { error } = await supabase.rpc('set_my_email', { new_email: email ?? '' });
  if (!error) return { ok: true };
  if (error.code === UNIQUE_VIOLATION) {
    return { ok: false, reason: 'unknown', message: 'E-mel ini sudah digunakan oleh akaun lain.' };
  }
  if (error.code === CHECK_VIOLATION) {
    return { ok: false, reason: 'unknown', message: 'E-mel seperti nama@contoh.com.' };
  }
  return asResult(error);
}

/**
 * Tags an SV/AS as sv or asisten, through set_supervisor_title() — the
 * narrow door, since RLS cannot restrict a table-wide UPDATE to one column.
 * Admin, or the Area Manager who covers that outlet, may call it; the table's
 * own CHECK refuses the tag on anyone but a supervisor.
 */
export async function updateSupervisorTitle(
  id: string,
  title: SupervisorTitle | null
): Promise<WriteResult> {
  const { error } = await supabase.rpc('set_supervisor_title', {
    target_id: id,
    new_title: title ?? '',
  });
  return asResult(error);
}

/**
 * A new payroll number for a person — payroll issues them per outlet and
 * position, so a transfer can bring one. The database carries every mark,
 * query, reminder and audit row across in the same statement and rewrites
 * the login address (20260918020000); the audit row is ours to write, as it
 * is for a role change. The table answers for a clash or a bad shape.
 */
export async function updateUserId(input: {
  from: string;
  to: string;
  changedBy: string | null;
}): Promise<WriteResult> {
  const { error } = await supabase.from('users').update({ id: input.to }).eq('id', input.from);
  if (error?.code === UNIQUE_VIOLATION) {
    return { ok: false, reason: 'unknown', message: `No. pekerja ${input.to} sudah digunakan.` };
  }
  if (error?.code === CHECK_VIOLATION) {
    return { ok: false, reason: 'unknown', message: 'Nombor pekerja: huruf dan angka sahaja, cth. KP0093 atau TPG001.' };
  }
  if (error) return asResult(error);

  const { error: auditErr } = await supabase.from('payroll_id_changes').insert({
    user_id: input.to,
    from_id: input.from,
    to_id: input.to,
    // Already renumbered if the admin changed their own; the reference
    // cascaded with everything else.
    changed_by: input.changedBy === input.from ? input.to : input.changedBy,
  });
  return asResult(auditErr);
}

/** Promotions and demotions on record, newest first. Admin-only under RLS. */
export async function fetchRoleChanges(): Promise<
  { userId: string; from: Role; to: Role; changedAt: string }[]
> {
  const { data, error } = await supabase
    .from('role_changes')
    .select('user_id, from_role, to_role, changed_at')
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    userId: r.user_id,
    from: r.from_role as Role,
    to: r.to_role as Role,
    changedAt: r.changed_at,
  }));
}

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
  /** `${userId}-${weekIdx}` -> the Area Manager's overriding percentage. */
  adjusted: Record<string, number>;
  /** `${userId}-${weekIdx}` -> that mark's max_score, for validating a new override. */
  markMax: Record<string, number>;
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
  const adjusted: Record<string, number> = {};
  const markMax: Record<string, number> = {};
  marks.forEach((m) => {
    const key = `${m.userId}-${m.weekNo - 1}`;
    markIds[key] = m.id;
    markMax[key] = m.maxScore;
    if (m.verified) verified[key] = true;
    if (m.note) notes[key] = m.note;
    if (m.adjustedTo != null) adjusted[key] = Math.round((m.adjustedTo / m.maxScore) * 100);
  });

  return {
    verified,
    notes,
    adjusted,
    markMax,
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
        email: u.email ?? null,
        supervisorTitle: (u.supervisor_title as SupervisorTitle | null) ?? null,
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
    adjusted: staff.adjusted,
    markMax: staff.markMax,
  };
}
