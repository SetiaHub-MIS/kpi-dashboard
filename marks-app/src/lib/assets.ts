import { todayIso } from '@/data/period';
import { supabase } from '@/lib/supabase';

/**
 * Checklist Kedai's asset log, against Postgres.
 *
 * Rows are a fixed catalog per branch (A) AIR-COND .. J) LAIN-LAIN) seeded once
 * per outlet — nobody adds or removes a row. What changes is the issues logged
 * against a row: several may be open at once (two air-conds down), and each is
 * resolved on its own (20261003040000). The row's own is_open/note columns are
 * a summary the database keeps for the reports app; the app reads the issues.
 */

export type AssetIssue = {
  id: number;
  note: string;
  openedOn: string;
};

export type AssetRow = {
  id: number;
  branchId: string;
  name: string;
  /** Open issues only, oldest first. Resolved ones stay in the database as history. */
  issues: AssetIssue[];
};

export const isAssetOpen = (a: AssetRow): boolean => a.issues.length > 0;

const toIssue = (i: any): AssetIssue => ({ id: i.id, note: i.note, openedOn: i.opened_on });

export async function fetchAssets(): Promise<AssetRow[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('id, branch_id, name, asset_issues(id, note, opened_on, resolved_on)')
    .is('asset_issues.resolved_on', null)
    .order('branch_id')
    .order('id')
    .order('opened_on', { referencedTable: 'asset_issues' })
    .order('id', { referencedTable: 'asset_issues' });

  if (error) throw error;
  return (data ?? []).map((a: any) => ({
    id: a.id,
    branchId: a.branch_id,
    name: a.name,
    issues: (a.asset_issues ?? []).map(toIssue),
  }));
}

/** Logs a new issue on the row, alongside any already open. */
export async function reportAssetIssue(assetId: number, note: string): Promise<AssetIssue> {
  const { data, error } = await supabase
    .from('asset_issues')
    .insert({ asset_id: assetId, note: note.trim(), opened_on: todayIso() })
    .select('id, note, opened_on')
    .single();

  if (error) throw error;
  return toIssue(data);
}

/** Marks one issue fixed. The others on the row stay open. */
export async function resolveAssetIssue(issueId: number): Promise<void> {
  const { error } = await supabase
    .from('asset_issues')
    .update({ resolved_on: todayIso() })
    .eq('id', issueId)
    .select('id')
    .single();

  if (error) throw error;
}
