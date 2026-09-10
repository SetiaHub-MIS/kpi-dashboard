import { supabase } from '@/lib/supabase';

/**
 * The staff <-> SV/AS question thread over one week's mark.
 *
 * RLS scopes every read and write here to the two people actually in the
 * conversation (the mark's owner and whoever scored it) plus head office — see
 * `mark_queries_read`/`mark_queries_write` in
 * `20260910030000_mark_queries.sql`. Nothing here re-checks that; a supervisor
 * or Area Manager elsewhere in the branch simply gets zero rows.
 */

export type QueryMessage = {
  id: number;
  markId: number;
  senderId: string;
  body: string;
  createdAt: string;
};

const ROW = 'id, mark_id, sender_id, body, created_at';

const toMessage = (r: any): QueryMessage => ({
  id: r.id,
  markId: r.mark_id,
  senderId: r.sender_id,
  body: r.body,
  createdAt: r.created_at,
});

export async function fetchQueries(markId: number): Promise<QueryMessage[]> {
  const { data, error } = await supabase
    .from('mark_queries')
    .select(ROW)
    .eq('mark_id', markId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toMessage);
}

export async function sendQuery(markId: number, senderId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('mark_queries')
    .insert({ mark_id: markId, sender_id: senderId, body: body.trim() });
  if (error) throw error;
}

/** Live new messages on one mark's thread. Call the returned function to stop. */
export function subscribeToQueries(
  markId: number,
  onInsert: (m: QueryMessage) => void
): () => void {
  const channel = supabase
    .channel(`mark_queries:${markId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mark_queries', filter: `mark_id=eq.${markId}` },
      (payload) => onInsert(toMessage(payload.new))
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export type ThreadSummary = {
  markId: number;
  userId: string;
  weekNo: number;
  periodYear: number;
  periodMonth: number;
  lastBody: string;
  lastAt: string;
  lastSenderId: string;
  count: number;
};

/**
 * Every thread on a mark this account scored, most recent message first.
 *
 * One round trip rather than a query per mark: `mark_queries` is small (a
 * short-lived Q&A, not a chat log), so grouping the flat rows client-side is
 * cheaper than N+1 queries.
 */
export async function fetchMyThreads(scoredBy: string): Promise<ThreadSummary[]> {
  const { data, error } = await supabase
    .from('mark_queries')
    .select(
      'mark_id, sender_id, body, created_at, marks!inner(user_id, week_no, period_year, period_month, scored_by)'
    )
    .eq('marks.scored_by', scoredBy)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const byMark = new Map<number, ThreadSummary>();
  (data ?? []).forEach((row: any) => {
    const m = Array.isArray(row.marks) ? row.marks[0] : row.marks;
    if (!m) return;
    const existing = byMark.get(row.mark_id);
    if (existing) {
      existing.count += 1;
      return;
    }
    // Rows arrive newest-first, so the first one seen per mark is the latest.
    byMark.set(row.mark_id, {
      markId: row.mark_id,
      userId: m.user_id,
      weekNo: m.week_no,
      periodYear: m.period_year,
      periodMonth: m.period_month,
      lastBody: row.body,
      lastAt: row.created_at,
      lastSenderId: row.sender_id,
      count: 1,
    });
  });

  return [...byMark.values()];
}
