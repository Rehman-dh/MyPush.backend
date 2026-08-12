-- ─────────────────────────────────────────────────────────────
-- Scheduling via Supabase pg_cron (works on the FREE tier).
-- Runs every minute and calls the dashboard's /api/cron/dispatch, which sends
-- due fixed-time notifications and advances per-timezone notifications.
--
-- Run this ONCE in the Supabase SQL editor. Replace the two placeholders:
--   1) <DASHBOARD_URL>  e.g. https://your-app.vercel.app  (no trailing slash)
--   2) <CRON_SECRET>    the same value as the CRON_SECRET env var on the dashboard
-- ─────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-run safe: drop the old job if it exists.
do $$
begin
  perform cron.unschedule('push-dispatch');
exception when others then
  null;
end $$;

select cron.schedule(
  'push-dispatch',
  '* * * * *',
  $$
    select net.http_get(
      url     := '<DASHBOARD_URL>/api/cron/dispatch',
      headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
    );
  $$
);

-- Inspect:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 20;
