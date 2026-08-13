# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hosted, OneSignal-style push notification platform that talks **directly to FCM** (iOS via FCM→APNs relay, no web push). Single owner, multi-app. `SPECS.md` is the original scope/locked-decisions doc; `README.md` covers end-to-end setup. Both are written in Roman Urdu (note: the product has since grown past SPECS.md — see Conventions).

Three deliverables in one repo:

- **`dashboard/`** — Next.js 14 App Router + TypeScript, styled with **Tailwind + shadcn/ui**. This is **both** the backend API (`src/app/api/*`) **and** the dashboard UI (`src/app/(app)/*`). Deployed to Vercel with root directory = `dashboard`.
- **`my_push/`** — Flutter/Dart SDK, distributed as a private git package (`publish_to: none`). **Has its own nested git repo** (`github.com/Rehman-dh/MyPush.Package`), gitignored from the backend repo — commit/push it separately.
- **`supabase/`** — `schema.sql` (Postgres schema) and `cron.sql` (pg_cron scheduler). Both are run **manually** in the Supabase SQL editor.

## Commands

Dashboard (from `dashboard/`):

```bash
npm install
npm run dev      # next dev
npm run build    # next build — the check before considering backend/UI work done
npm run lint     # next lint (interactive first-run setup; prefer `npx tsc --noEmit` for a quick type-check)
```

SDK (from `my_push/`): `flutter analyze` (and `flutter pub get` first if deps changed).

There is no test suite in either project — verify with `npm run build` / `npx tsc --noEmit` and `flutter analyze`.

**Dev gotcha:** don't run `next build` while `next dev` is running against the same `.next` — it corrupts the dev manifests and causes phantom 404s / "Cannot find module ./vendor-chunks/*". If that happens, stop dev, `rm -rf .next`, restart.

After a schema change, the new columns must be applied by running the idempotent `alter table` statements in `supabase/schema.sql` in Supabase — sends will fail against a stale schema.

## Architecture — the parts that span multiple files

### Delivery pipeline (`dashboard/src/lib/delivery.ts`)

- `buildFcmMessage(notification)` maps the stored row → an FCM multicast payload: `apns.payload.aps` (alert/subtitle, badge, sound, content-available, interruption-level), `apns.headers` (priority, collapse-id, expiration), `android` (priority, ttl, collapseKey, `notification` styling), and `data`. **Button rule:** when `options.buttons` is non-empty the Android payload is sent **data-only** (no `notification` block) so the SDK renders the action buttons; otherwise a normal `notification`+data message is sent.
- `resolveAudience()` / `filteredDeviceQuery()` apply app + subscribed + **platform** (`notifications.platforms`) + target (tags `@>` / `external_ids IN`) filters, plus an optional **timezone** subset (for per-timezone delivery). `audienceTimezones()` returns the distinct zones for a notification.
- `dispatchNotification(n, app, opts?)` sends to one (optionally platform/timezone-scoped) subset and **returns** counts — it does not touch status. `dispatchAndFinalize(n, app)` wraps it for the full-audience case: flips status `sending → completed`, persists counts, sets `failed` on throw.
- Dead-token detection is `lib/fcm.ts` `isUnregisteredError()`; matching codes flip `devices.subscribed = false`.

**Three send entry points — keep consistent:**
1. `sendNotificationAction` (dashboard Compose) — `src/app/actions.ts`. The rich form serializes its whole state to a single `payload` JSON FormData field; the action parses it, inserts the row, and for `delivery_mode='now'` calls `dispatchAndFinalize`.
2. `POST /api/notifications` (REST, `Bearer sk_...`) — `src/app/api/notifications/route.ts`. Accepts the same optional fields; backward compatible.
3. `GET /api/cron/dispatch` — scheduled sends (see below).

### Scheduling: Supabase pg_cron + per-timezone dispatch

Scheduling does **not** use Vercel Cron (Hobby only fires ~daily). `supabase/cron.sql` uses `pg_cron` + `pg_net` to call `/api/cron/dispatch` every minute (free-tier friendly). The endpoint:
- **fixed** sends: atomically claims `UPDATE ... status scheduled→sending WHERE delivery_mode='fixed' AND scheduled_at<=now() RETURNING` (overlap-safe), then `dispatchAndFinalize` each.
- **per-timezone** sends (`delivery_mode='timezone'`, `status='scheduling'`): for each distinct audience timezone whose local `tz_send_date tz_send_local` has arrived (`lib/timezone.ts` `isLocalTimeReached`, Intl-based), dispatch that subset and record it in `tz_completed` (jsonb dedupe set); mark `completed` when all zones are done. Null-timezone devices are a `__null__` fallback bucket sent at the UTC wall-clock.

Protected by `Bearer $CRON_SECRET`.

### UI: app-scoped nested routes + shadcn shell

Two-level IA under `src/app/(app)/`:
- `apps/page.tsx` — **All Apps** table (landing); clicking a row enters an app.
- `apps/[appId]/layout.tsx` — the app shell: `SidebarProvider` + `AppSidebar` (`src/components/app-sidebar.tsx`, app switcher + nav) + a sticky header. `apps/[appId]/{dashboard,compose,notifications,devices,settings}/` are the app-scoped pages. **The active app lives in the URL — there is no cookie/switcher state.**

shadcn/ui primitives live in `src/components/ui/*` (`cn()` in `lib/utils.ts`). Light/dark via `next-themes` (`components/theme-provider.tsx`, `theme-toggle.tsx`); root `layout.tsx` must keep `suppressHydrationWarning` and no hardcoded body colors. Data-fetching pages/layouts are **server** components passing plain props into client children; never import a client hook into them. Recharts is pinned to **v2** (shadcn `chart` targets v2). Each route has a `loading.tsx` skeleton.

### Four distinct auth models — do not mix them

- **Client SDK endpoints** (`/api/devices`, `/api/devices/[id]`, `.../tags`, `/api/events`, `/api/config`): `X-App-Key` header → `appFromPublicKey()` in `lib/auth.ts`. Public/client-safe, no sending.
- **Send/admin API** (`POST /api/notifications`): `Authorization: Bearer <sk_...>` → `appFromSecretKey()`. Secret, server-side only.
- **App bootstrap** (`/api/apps`): `X-Admin-Token` matched against `ADMIN_SETUP_TOKEN`. Pre-UI path; the dashboard creates apps via server actions instead.
- **Dashboard pages & server actions**: Supabase Auth session. `middleware.ts` protects everything except `/login`, `/api/*`, static assets. Server actions gate on `currentUser()` via `requireAuth()`.

### Database access is always service-role

Every API route and server action uses `supabaseAdmin()` (`lib/supabase.ts`), the service-role client that **bypasses RLS**. Never import it into client components. Browser-side Supabase (auth only) is `supabase-browser.ts`; server-session reads are `supabase-server.ts`.

### Secrets handling

- FCM service-account JSON is encrypted at rest (AES-256-GCM) via `lib/crypto.ts` before going into `apps.fcm_service_account`. Requires `CREDENTIALS_ENCRYPTION_KEY` (32-byte hex).
- Secret REST keys are stored **only as a SHA-256 hash**; the plaintext (`sk_...`) is returned exactly once at create time. Public keys are `pub_...`.
- Per-app `firebase-admin` instances are decrypted lazily and cached as **named apps** in `lib/fcm.ts` so multiple apps coexist in one serverless process.

### Node runtime is required

API routes that touch `firebase-admin` or `crypto` must keep `export const runtime = "nodejs"` and `export const maxDuration = 60` — do not let them default to Edge.

### Zero-config Firebase for the SDK

The SDK avoids `flutterfire configure` / `google-services.json` in the host app: the dashboard parses a pasted `google-services.json` / `GoogleService-Info.plist` (`lib/firebase-config.ts`) into client `FirebaseOptions`, stores them in `apps.firebase_client_config`, and the SDK fetches them from `GET /api/config` and calls `Firebase.initializeApp()` itself. Pass `autoInitializeFirebase: false` to opt out.

### SDK shape (`my_push/lib/my_push.dart`)

Singleton facade `MyPush.instance`. Device identity is a locally generated UUIDv4 in `shared_preferences` (`my_push_device_id`) = `devices.id`. HTTP calls live in `src/api_client.dart`.

It renders **rich** notifications (big-picture image, large icon, accent color, iOS subtitle/attachment, sound) built in `_buildDetails()` from the push `data`. **Action buttons** are parsed from `data['buttons']`; a top-level `@pragma('vm:entry-point')` `onBackgroundMessage` handler renders data-only (button) messages when backgrounded. Clicks/button-taps funnel into `onNotificationClick(data)` (button taps add `data['action_id']`) and report to `POST /api/events`. iOS action buttons need categories registered at init via `initialize(iosCategories: [...])`, and iOS **background** buttons/images need the app-side Notification Service Extension documented in `my_push/IOS_NSE.md`.

## Conventions

- Deliverables — dashboard UI text, Flutter package, and code comments — must be **English**. `README.md`/`SPECS.md` are the existing Roman-Urdu exception; new user-facing strings and comments should be English.
- Targeting is limited to tag **equality + AND** (`tags @> {...}`) and `external_ids IN (...)` — no richer operators or saved segments. In-app/email/SMS, A/B testing, dynamic content, and web push remain out of scope. (Per-user-timezone scheduling and action buttons, once Phase 2 in SPECS.md, are now implemented — SPECS.md is no longer exhaustive.)
