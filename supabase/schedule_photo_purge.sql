-- Run the photo-retention purge every night.
--
-- Once, in the Supabase SQL editor, after deploying the purge-return-photos
-- Edge Function. It needs two extensions switched on first:
--   Dashboard → Database → Extensions → pg_cron (on) and pg_net (on)
--
-- 1. Store the service-role key where the job can read it without the key
--    appearing in the job itself. Paste it from
--    Dashboard → Project Settings → API Keys → service_role (secret).
--    Run this line once; running it again says the name is taken.

SELECT vault.create_secret('PASTE-SERVICE-ROLE-KEY-HERE', 'service_role_key');

-- 2. The job. 19:00 UTC is 03:00 in Malaysia — nobody is uploading then.

SELECT cron.schedule(
  'purge-return-photos',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://aorkigafuepkexymexjt.supabase.co/functions/v1/purge-return-photos',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- 3. Check it is there, and later that it ran:
--   SELECT jobname, schedule, active FROM cron.job;
--   SELECT status, return_message, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
--   SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 5;
--
-- To stop it:  SELECT cron.unschedule('purge-return-photos');
