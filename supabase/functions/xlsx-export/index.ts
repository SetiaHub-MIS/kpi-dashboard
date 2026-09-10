// XLSX export — Sprint 4's "Export (XLSX)" story on the Area Manager home.
//
// This runs the caller's own queries under their own RLS: the client's
// Authorization header (the caller's session JWT) is forwarded straight into
// the Supabase client used here, rather than a service-role key. That means
// the export is scoped exactly the way every other screen in the app is — a
// supervisor exports their own branch, an Area Manager their covered outlets,
// head office everyone — with no separate reach to keep in sync by hand.
//
// Deploy with the Supabase CLI once linked to the project:
//   supabase functions deploy xlsx-export
//
// @ts-nocheck — this file runs on Deno (the Supabase Edge Runtime), not
// Node/React Native, so it is outside the app's tsconfig and its `npm:`/`Deno`
// globals are unresolved by the editor's TypeScript service.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import * as XLSX from 'npm:xlsx@0.18.5';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONTH_NAMES = [
  'JANUARI', 'FEBRUARI', 'MAC', 'APRIL', 'MEI', 'JUN',
  'JULAI', 'OGOS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DISEMBER',
];

const ROLE_LABEL: Record<string, string> = {
  staff: 'Pekerja Kedai',
  store: 'Pekerja Stor',
  clerk: 'Kerani Stor',
  supervisor: 'SV / AS',
  area_manager: 'Area Manager',
  manager: 'Manager',
  general_manager: 'General Manager',
  human_resources: 'Human Resources',
  admin: 'Admin',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Not signed in.' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { year, month } = await req.json();
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return json({ error: 'year and month (1-12) are required.' }, 400);
    }

    const [{ data: users, error: userErr }, { data: marks, error: markErr }, { data: branches, error: branchErr }] =
      await Promise.all([
        supabase.from('users').select('id, name, short_name, role, branch_id, active').order('id'),
        supabase
          .from('marks')
          .select('user_id, branch_id, form_key, week_no, pct')
          .eq('period_year', year)
          .eq('period_month', month),
        supabase.from('branches').select('id, name, short_name').order('id'),
      ]);

    if (userErr) throw userErr;
    if (markErr) throw markErr;
    if (branchErr) throw branchErr;

    // RLS already confined every row above to what this caller may see —
    // nothing here narrows it further.
    const branchName = new Map((branches ?? []).map((b: any) => [b.id, b.short_name ?? b.name]));

    const byPerson = new Map<string, Record<number, number>>();
    (marks ?? []).forEach((m: any) => {
      const weeks = byPerson.get(m.user_id) ?? {};
      weeks[m.week_no] = m.pct;
      byPerson.set(m.user_id, weeks);
    });

    const rows: (string | number)[][] = [
      ['No. Pekerja', 'Nama', 'Cawangan', 'Peranan', 'Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4', 'Purata'],
    ];

    (users ?? [])
      .filter((u: any) => u.active && byPerson.has(u.id))
      .forEach((u: any) => {
        const weeks = byPerson.get(u.id) ?? {};
        const values = [1, 2, 3, 4].map((w) => weeks[w]);
        const scored = values.filter((v): v is number => v != null);
        const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : '';
        rows.push([
          u.id,
          u.name,
          branchName.get(u.branch_id) ?? u.branch_id ?? '',
          ROLE_LABEL[u.role] ?? u.role,
          // Blank cells for a week nobody marked — never a formula error, the
          // whole point of the app replacing the workbook this mirrors.
          ...values.map((v) => (v == null ? '' : v)),
          avg,
        ]);
      });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 26 }, { wch: 20 }, { wch: 16 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Markah');

    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const filename = `Markah_${MONTH_NAMES[month - 1]}_${year}.xlsx`;

    return json({ base64, filename });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
