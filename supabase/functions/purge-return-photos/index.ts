// Retention for return photo evidence.
//
// A photo is kept until 30 days after its bill clears (stock adjusted), then
// removed — that is what keeps the bucket near 134 MB instead of growing for
// ever. Supabase refuses a file deleted in SQL, so this cannot be a database
// function any more (20260919080000): the database says what is due, and
// this removes the files through the Storage API, then the rows.
//
// Also swept: files in the bucket with no row — invisible to the app, and
// otherwise kept, and paid for, forever.
//
//   POST {}                                  -> remove what is due
//   POST { "dry_run": true }                 -> list it, remove nothing
//   POST { "after_days": 45 }                -> keep evidence longer this run
//
// Who may call it: the scheduled job (service-role key, see
// supabase/schedule_photo_purge.sql) or an admin running it by hand.
//
// Deploy from the repository root:
//   npx supabase functions deploy purge-return-photos
//
// @ts-nocheck — Deno (Supabase Edge Runtime), outside the app's tsconfig.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const BUCKET = 'return-photos';
// The promise is 30 days. A shorter run would throw away evidence a supplier
// may still be disputing, so it is refused rather than obeyed.
const MIN_DAYS = 30;
const CHUNK = 100;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceKey, noSession);

  // --- who is asking
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let allowed = token !== '' && token === serviceKey;
  if (!allowed && token) {
    const { data: auth } = await admin.auth.getUser(token);
    if (auth?.user) {
      const { data: me } = await admin
        .from('users')
        .select('role, active')
        .eq('auth_user_id', auth.user.id)
        .maybeSingle();
      allowed = me?.role === 'admin' && me.active === true;
    }
  }
  if (!allowed) return json({ error: 'forbidden' }, 403);

  // --- what to do
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // An empty body means "the defaults".
  }
  const afterDays = body.after_days == null ? MIN_DAYS : Number(body.after_days);
  if (!Number.isInteger(afterDays) || afterDays < MIN_DAYS) {
    return json({ error: `after_days must be a whole number of at least ${MIN_DAYS}` }, 400);
  }
  const dryRun = body.dry_run === true;

  const { data: due, error: dueErr } = await admin.rpc('return_photos_due_for_purge', {
    after_days: afterDays,
  });
  if (dueErr) return json({ error: 'lookup_failed', detail: dueErr.message }, 500);

  const rows = (due ?? []) as { photo_id: number | null; storage_path: string }[];
  const summary = {
    cleared_bill_photos: rows.filter((r) => r.photo_id != null).length,
    stray_files: rows.filter((r) => r.photo_id == null).length,
  };
  if (dryRun) return json({ dry_run: true, after_days: afterDays, ...summary, paths: rows.map((r) => r.storage_path) });

  // --- files first, through the Storage API. A chunk that fails keeps its
  // rows, so the photos stay visible and the next run tries again.
  const failed = new Set<string>();
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const paths = rows.slice(i, i + CHUNK).map((r) => r.storage_path);
    const { error } = await admin.storage.from(BUCKET).remove(paths);
    if (error) {
      paths.forEach((p) => failed.add(p));
      errors.push(error.message);
    }
  }

  // --- then the rows whose files are gone.
  const ids = rows
    .filter((r) => r.photo_id != null && !failed.has(r.storage_path))
    .map((r) => r.photo_id as number);
  let rowsDeleted = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { error } = await admin.from('return_photos').delete().in('id', chunk);
    if (error) errors.push(error.message);
    else rowsDeleted += chunk.length;
  }

  if (errors.length > 0) console.error(`purge-return-photos: ${errors.join(' | ')}`);

  return json({
    after_days: afterDays,
    ...summary,
    files_removed: rows.length - failed.size,
    rows_deleted: rowsDeleted,
    errors,
  }, errors.length > 0 ? 207 : 200);
});
