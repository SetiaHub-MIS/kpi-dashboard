import { todayIso } from '@/data/period';
import { supabase } from '@/lib/supabase';

/**
 * Checklist Kedai's asset log, against Postgres.
 *
 * Rows are a fixed catalog per branch (A) AIR-COND .. J) LAIN-LAIN) seeded once
 * per outlet — nobody adds or removes a row here, they only flip its state, so
 * there is no create/delete path, only update.
 */

export type AssetRow = {
  id: number;
  branchId: string;
  name: string;
  isOpen: boolean;
  note: string | null;
  openedOn: string | null;
  resolvedOn: string | null;
};

export async function fetchAssets(): Promise<AssetRow[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('id, branch_id, name, is_open, note, opened_on, resolved_on')
    .order('branch_id')
    .order('id');

  if (error) throw error;
  return (data ?? []).map((a: any) => ({
    id: a.id,
    branchId: a.branch_id,
    name: a.name,
    isOpen: a.is_open,
    note: a.note,
    openedOn: a.opened_on,
    resolvedOn: a.resolved_on,
  }));
}

/** Reports a new issue, or replaces the note on one already open. */
export async function reportAssetIssue(id: number, note: string): Promise<AssetRow> {
  const { data, error } = await supabase
    .from('assets')
    .update({ is_open: true, note: note.trim(), opened_on: todayIso(), resolved_on: null })
    .eq('id', id)
    .select('id, branch_id, name, is_open, note, opened_on, resolved_on')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    branchId: data.branch_id,
    name: data.name,
    isOpen: data.is_open,
    note: data.note,
    openedOn: data.opened_on,
    resolvedOn: data.resolved_on,
  };
}

/** Marks an issue fixed. The note stays as the record of what it was. */
export async function resolveAssetIssue(id: number): Promise<AssetRow> {
  const { data, error } = await supabase
    .from('assets')
    .update({ is_open: false, resolved_on: todayIso() })
    .eq('id', id)
    .select('id, branch_id, name, is_open, note, opened_on, resolved_on')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    branchId: data.branch_id,
    name: data.name,
    isOpen: data.is_open,
    note: data.note,
    openedOn: data.opened_on,
    resolvedOn: data.resolved_on,
  };
}
