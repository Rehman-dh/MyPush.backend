# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hosted, OneSignal-style push notification platform that talks **directly to FCM** (iOS via FCM→APNs relay, no web push). Single owner, multi-app. `SPECS.md` is the single source of truth for scope and locked decisions; `README.md` covers end-to-end setup. Both are written in Roman Urdu.

Three deliverables in one repo:

- **`dashboard/`** — Next.js 14 App Router (TypeScript). This is **both** the backend API (`src/app/api/*`) **and** the dashboard UI (`src/app/(app)/*`). Deployed to Vercel with root directory = `dashboard`.
- **`my_push/`** — Flutter/Dart SDK, distributed as a private git package (`publish_to: none`). Has its own git repo nested inside.
- **`supabase/schema.sql`** — Postgres schema; run it manually in the Supabase SQL editor.

## Commands

All dashboard commands run from `dashboard/`:

```bash
npm install
npm run dev      # next dev
npm run build    # next build — the check to run before considering backend/UI work done
npm run lint     # next lint
```

There is no test suite in either project. Verify the dashboard with `npm run build` and the SDK with:

```bash
cd my_push && flutter analyze
```

## Architecture — the parts that span multiple files

### Delivery pipeline is a single shared function

`dashboard/src/lib/delivery.ts` `dispatchNotification()` is the one code path that resolves an audience, batches tokens (500/call), calls `sendEachForMulticast`, updates `sent/failed_count`, and auto-unsubscribes dead tokens. It is called from **three** entry points — keep them consistent:

1. `POST /api/notifications` (send-now) — `src/app/api/notifications/route.ts`
2. `GET /api/cron/dispatch` (scheduled) — `src/app/api/cron/dispatch/route.ts`
3. `sendNotificationAction` server action (dashboard Compose) — `src/app/actions.ts`

Dead-token detection lives in `lib/fcm.ts` `isUnregisteredError()`; matching codes flip `devices.subscribed = false`.

### Four distinct auth models — do not mix them

- **Client SDK endpoints** (`/api/devices`, `/api/devices/[id]`, `.../tags`, `/api/events`, `/api/config`): `X-App-Key` header → resolved by `appFromPublicKey()` in `lib/auth.ts`. Public/client-safe scope, no sending.
- **Send/admin API** (`POST /api/notifications`): `Authorization: Bearer <sk_...>` → `appFromSecretKey()`. Secret, server-side only.
- **App bootstrap** (`/api/apps`): `X-Admin-Token` header matched against `ADMIN_SETUP_TOKEN` env. This is the pre-UI path; the dashboard UI creates apps via server actions instead.
- **Dashboard pages & server actions**: Supabase Auth session. `middleware.ts` protects everything except `/login`, `/api/*`, and static assets. Server actions gate on `currentUser()` via `requireAuth()`.

### Database access is always service-role

Every API route and server action uses `supabaseAdmin()` (`lib/supabase.ts`), the service-role client that **bypasses RLS**. Never import it into client components. Browser-side Supabase (auth only) is `supabase-browser.ts`; server-session reads are `supabase-server.ts`.

### Secrets handling

- FCM service-account JSON is encrypted at rest (AES-256-GCM) via `lib/crypto.ts` before going into `apps.fcm_service_account`. Requires `CREDENTIALS_ENCRYPTION_KEY` (32-byte hex).
- Secret REST keys are stored **only as a SHA-256 hash**; the plaintext (`sk_...`) is returned exactly once at create time. Public keys are `pub_...`.
- Per-app `firebase-admin` instances are decrypted lazily and cached as **named apps** in `lib/fcm.ts` so multiple apps coexist in one serverless process.

### Cron double-send guard

`/api/cron/dispatch` runs every minute (`vercel.json`). It claims work atomically: a single `UPDATE ... status scheduled→sending ... RETURNING` means overlapping cron runs never grab the same notification. Protected by `Bearer $CRON_SECRET` (Vercel Cron sends this automatically).

### Node runtime is required

API routes that touch `firebase-admin` or `crypto` must keep `export const runtime = "nodejs"` and `export const maxDuration = 60` — do not let them default to the Edge runtime.

### Zero-config Firebase for the SDK

The SDK avoids `flutterfire configure` / `google-services.json` in the host app: the dashboard parses a pasted `google-services.json` and/or `GoogleService-Info.plist` (`lib/firebase-config.ts`) into client `FirebaseOptions`, stores them in `apps.firebase_client_config`, and the SDK fetches them from `GET /api/config` and calls `Firebase.initializeApp()` itself. Pass `autoInitializeFirebase: false` to opt out.

### SDK shape (`my_push/lib/my_push.dart`)

Singleton facade `MyPush.instance` (note: SPECS.md shows static calls, code uses the instance). Device identity is a locally generated UUIDv4 persisted in `shared_preferences` (`my_push_device_id`) — this is the `devices.id`. Foreground messages are shown via `flutter_local_notifications`; clicks fire `onNotificationClick(data)` and report to `POST /api/events`. HTTP calls live in `src/api_client.dart`.

## Conventions

- Deliverables — dashboard UI text, Flutter package, and code comments — must be **English**. `README.md`/`SPECS.md` are the existing Roman-Urdu exception; new user-facing strings and comments should be English.
- Targeting is intentionally limited to tag **equality + AND** (`tags @> {...}`) and `external_ids IN (...)`. Richer operators, saved segments, in-app/email/SMS, and A/B are explicitly Phase 2 (see SPECS.md §14) — don't add them unless asked.
