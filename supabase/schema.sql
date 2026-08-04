-- Push Notification System — Postgres schema (Supabase)
-- Run this in Supabase SQL editor. Idempotent-ish (uses IF NOT EXISTS where possible).

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ─────────────────────────────────────────────────────────────
-- apps: har app ka credential set (multi-app, single owner)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.apps (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  public_app_key        text not null unique,        -- embedded in the client SDK (pub_...)
  secret_rest_key_hash  text not null,               -- SHA-256 hash of the secret key (sk_...)
  fcm_service_account   jsonb,                        -- AES-GCM encrypted { iv, tag, data } (for sending)
  firebase_client_config jsonb,                       -- { android?: FirebaseOptions, ios?: FirebaseOptions } (for zero-config SDK init)
  created_at            timestamptz not null default now()
);

-- For existing databases: add the column if the table already exists.
alter table public.apps add column if not exists firebase_client_config jsonb;

-- ─────────────────────────────────────────────────────────────
-- devices: registered push subscriptions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.devices (
  id                uuid primary key,                 -- client-generated subscription id
  app_id            uuid not null references public.apps(id) on delete cascade,
  push_token        text not null,
  platform          text not null check (platform in ('android','ios')),
  external_user_id  text,
  tags              jsonb not null default '{}'::jsonb,
  language          text,
  timezone          text,
  os_version        text,
  app_version       text,
  device_model      text,
  subscribed        boolean not null default true,
  last_active_at    timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index if not exists idx_devices_app_extid  on public.devices (app_id, external_user_id);
create index if not exists idx_devices_app_token  on public.devices (app_id, push_token);
create index if not exists idx_devices_app_sub     on public.devices (app_id, subscribed);
create index if not exists idx_devices_tags_gin    on public.devices using gin (tags);

-- ─────────────────────────────────────────────────────────────
-- notifications: har send/schedule ka record
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  app_id         uuid not null references public.apps(id) on delete cascade,
  title          text not null,
  body           text not null,
  image_url      text,
  launch_url     text,
  data           jsonb not null default '{}'::jsonb,
  target_type    text not null check (target_type in ('all','tags','external_ids')),
  target_filter  jsonb not null default '{}'::jsonb,   -- tags: {"city":"lahore"} | external_ids: ["4821"]
  status         text not null default 'sending'
                   check (status in ('scheduled','sending','completed','failed')),
  scheduled_at   timestamptz,
  sent_count     integer not null default 0,
  failed_count   integer not null default 0,
  clicked_count  integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists idx_notifications_app      on public.notifications (app_id, created_at desc);
create index if not exists idx_notifications_schedule on public.notifications (status, scheduled_at)
  where status = 'scheduled';

-- ─────────────────────────────────────────────────────────────
-- events: click (aur future engagement) tracking — detail table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  notification_id  uuid not null references public.notifications(id) on delete cascade,
  device_id        uuid,
  type             text not null check (type in ('clicked')),
  created_at       timestamptz not null default now()
);

create index if not exists idx_events_notification on public.events (notification_id);

-- ─────────────────────────────────────────────────────────────
-- Atomic click-count increment (race-safe under concurrent clicks)
-- ─────────────────────────────────────────────────────────────
create or replace function public.increment_notification_clicks(nid uuid)
returns void language sql as $$
  update public.notifications set clicked_count = clicked_count + 1 where id = nid;
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS: sab access service-role key se hoga (server-side only).
-- Anon/public ko koi direct table access nahi — API layer gatekeeper hai.
-- ─────────────────────────────────────────────────────────────
alter table public.apps          enable row level security;
alter table public.devices       enable row level security;
alter table public.notifications enable row level security;
alter table public.events        enable row level security;
-- (koi policy nahi = default deny for anon; service_role RLS bypass karta hai.)
