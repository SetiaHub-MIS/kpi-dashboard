import { AGEING_LABEL, AgeingStatus, DISPOSITION_LABEL, Disposition, REASON_LABEL, ReturnReason, STAGE_LABEL, Stage } from '@/data/returns';
import { FORM_LABEL, FormKey } from '@/data/checklist';
import { FIELD_LABEL, VendorField } from '@/data/reconcile';
import { ROLE_BLURB, ROLE_LABEL, Role } from '@/data/users';
import { Locale } from '@/i18n/strings';

/**
 * English counterparts for the app's own domain vocabulary — role names,
 * return stages, ageing status. Unlike the checklist perkara/kategori names,
 * these were never anyone's paper form; they are labels this app invented,
 * so translating them carries none of the "does it still match the sheet"
 * risk that keeps FORM/STOR_FORM/SV_FORM untouched.
 *
 * Deliberately separate from the data layer (data/users.ts, data/returns.ts,
 * data/checklist.ts keep their Malay-only *_LABEL exports, unchanged, since
 * CSV export and reconciliation compare against the vendor's own file and
 * must not shift with the UI language) — this module is the only place that
 * depends on both data and i18n.
 */

const ROLE_EN: Record<Role, string> = {
  staff: 'Shop Staff',
  store: 'Store Staff',
  clerk: 'Store Clerk',
  supervisor: 'Supervisor',
  area_manager: 'Area Manager',
  manager: 'Manager',
  general_manager: 'General Manager',
  human_resources: 'Human Resources',
  admin: 'Admin',
};

export function roleLabel(role: Role, locale: Locale): string {
  return locale === 'en' ? ROLE_EN[role] : ROLE_LABEL[role];
}

const ROLE_BLURB_EN: Record<Role, string> = {
  staff: 'Scored weekly on the 22-item shop checklist.',
  store: 'Central store at HQ. Scored weekly on the 17-item store checklist.',
  clerk: 'Central store at HQ. Handles supplier calls and pickup of returned goods.',
  supervisor: 'Scores shop and store staff every week.',
  area_manager: 'Signs off SV/AS scores, monitors assets and their own tugasan.',
  manager: 'All-branch report, shop side only. No returns or store scores.',
  general_manager: 'All-branch report — shop scores, store scores and returns KPI.',
  human_resources: 'Every branch — every staff member’s scores, store KPI and returns flow.',
  admin: 'Administration only — accounts, roles, branches. No returns access.',
};

export function roleBlurb(role: Role, locale: Locale): string {
  return locale === 'en' ? ROLE_BLURB_EN[role] : ROLE_BLURB[role];
}

const STAGE_EN: Record<Stage, string> = {
  received: 'Receive the return list',
  submitted_to_clerk: 'Send list to clerk',
  segregated: 'Separate & decide disposition',
  supplier_called: 'Contact supplier',
  picked_up: 'Supplier collects goods',
  discarded: 'Goods discarded',
  adjusted: 'Stock adjustment',
};

export function stageLabel(stage: Stage, locale: Locale): string {
  return locale === 'en' ? STAGE_EN[stage] : STAGE_LABEL[stage];
}

const REASON_EN: Record<ReturnReason, string> = { damage: 'Damaged', expired: 'Expired' };

export function reasonLabel(reason: ReturnReason, locale: Locale): string {
  return locale === 'en' ? REASON_EN[reason] : REASON_LABEL[reason];
}

const DISPOSITION_EN: Record<Disposition, string> = {
  supplier: 'Return to supplier',
  discard: 'Discard',
};

export function dispositionLabel(disposition: Disposition, locale: Locale): string {
  return locale === 'en' ? DISPOSITION_EN[disposition] : DISPOSITION_LABEL[disposition];
}

const AGEING_EN: Record<AgeingStatus, string> = {
  cleared: 'Cleared',
  ok: 'On track',
  breach: 'Over 2 months',
  overdue: 'Overdue action',
};

export function ageingLabel(status: AgeingStatus, locale: Locale): string {
  return locale === 'en' ? AGEING_EN[status] : AGEING_LABEL[status];
}

const FORM_EN: Record<FormKey, string> = {
  kedai: 'Shop Staff Checklist',
  stor: 'Store Staff Checklist',
  sv: 'Supervisor Checklist',
};

export function formLabel(key: FormKey, locale: Locale): string {
  return locale === 'en' ? FORM_EN[key] : FORM_LABEL[key];
}

const FIELD_EN: Record<VendorField, string> = {
  billNo: 'Bill no.',
  billDate: 'Bill date',
  branch: 'Location code',
  billType: 'Bill type',
  supplier: 'Supplier',
  amount: 'Amount',
};

export function fieldLabel(field: VendorField, locale: Locale): string {
  return locale === 'en' ? FIELD_EN[field] : FIELD_LABEL[field];
}
