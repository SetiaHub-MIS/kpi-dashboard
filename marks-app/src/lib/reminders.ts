import { supabase } from '@/lib/supabase';

/**
 * In-app nudges from an Area Manager to an SV/AS about unmarked crew.
 *
 * Stands in for the Expo Push story in the sprint plan — real remote push
 * needs an EAS development build and Firebase credentials, neither of which
 * exist for this project yet, and Expo Go itself can no longer receive remote
 * push at all. A reminder here is just a row the recipient's own session
 * reads under RLS, so it needs no push infrastructure; upgrading to real push
 * later only adds a sender on top of this table.
 */

export type Reminder = {
  id: number;
  branchId: string;
  recipientId: string;
  sentBy: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

const ROW = 'id, branch_id, recipient_id, sent_by, message, created_at, read_at';

const toReminder = (r: any): Reminder => ({
  id: r.id,
  branchId: r.branch_id,
  recipientId: r.recipient_id,
  sentBy: r.sent_by,
  message: r.message,
  createdAt: r.created_at,
  readAt: r.read_at,
});

/** Everything addressed to the signed-in account, newest first. */
export async function fetchMyReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select(ROW)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toReminder);
}

export async function sendReminder(input: {
  branchId: string;
  recipientId: string;
  sentBy: string;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from('reminders').insert({
    branch_id: input.branchId,
    recipient_id: input.recipientId,
    sent_by: input.sentBy,
    message: input.message.trim(),
  });
  if (error) throw error;
}

export async function markReminderRead(id: number): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
