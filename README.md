# Notification SDK — Self-hosted Push Platform

Your own OneSignal-style push notification system. It talks directly to FCM (iOS too, via an FCM→APNs relay). OneSignal went paid — this is a self-hosted replacement for it.

```
├── SPECS.md            # Full technical specification (single source of truth)
├── supabase/
│   └── schema.sql      # Postgres schema — run it in the Supabase SQL editor
├── dashboard/          # Next.js app (API + dashboard UI), deployed to Vercel
└── my_push/            # Flutter SDK (private git package)
```

## Three parts

1. **`my_push` Flutter SDK** — inside the app: registration, tags, login, notification handling. See [my_push/README.md](my_push/README.md).
2. **Backend API** — `dashboard/src/app/api/*` — devices, notifications, transactional send, cron dispatch.
3. **Dashboard** — Next.js UI (compose, target, schedule, analytics).

## Quick Setup

### 1. Supabase
- Create a Supabase project → run [supabase/schema.sql](supabase/schema.sql) in the SQL editor.
- From project settings, grab: `URL`, `anon key`, `service_role key`.

### 2. Dashboard (`dashboard/`)
```bash
cd dashboard
cp .env.example .env.local     # fill in the values
npm install
npm run dev
```
`.env.local` keys:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CREDENTIALS_ENCRYPTION_KEY` = `openssl rand -hex 32`
- `CRON_SECRET` = `openssl rand -hex 32`
- `ADMIN_SETUP_TOKEN` = `openssl rand -hex 32`

### 3. Create an app + FCM credentials
Firebase Console → Project Settings → Service Accounts → **Generate new private key** (downloads a JSON). Then:
```bash
curl -X POST http://localhost:3000/api/apps \
  -H "X-Admin-Token: $ADMIN_SETUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","fcm_service_account": <paste serviceAccount JSON> }'
```
The response returns `public_app_key` (for the SDK) and `secret_rest_key` (for sending). **The secret key is shown only once.**

### 3b. Firebase client config (zero-config SDK — OneSignal-style)
So you don't have to run `flutterfire configure` / add `google-services.json` in the app:
- Dashboard → **Apps** → your app → **Set up Firebase config**
- **Paste** the Android `google-services.json` and/or the iOS `GoogleService-Info.plist` (from Firebase Console → Project Settings → Your apps)
- The SDK fetches this config via `GET /api/config` and calls `Firebase.initializeApp()` itself

### 4. Flutter app
Add the `my_push` package and initialize it with just the `public_app_key` + dashboard URL — no manual Firebase setup is needed in the app. Details: [my_push/README.md](my_push/README.md).

### 5. Deploy (Vercel)
Deploy `dashboard/` to Vercel. Set the env vars. The cron (`/api/cron/dispatch` every minute) is already declared in `vercel.json`.

## Send test (curl)
```bash
# Send to all
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <secret_rest_key>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hi 👋","body":"Test","target_type":"all"}'

# Send to a user (transactional)
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <secret_rest_key>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Order shipped","body":"On the way","target_type":"external_ids","target_filter":["4821"],"data":{"screen":"order","order_id":"A-100"}}'

# Send to a segment (tags, equality + AND)
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <secret_rest_key>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Lahore only","body":"Hello","target_type":"tags","target_filter":{"city":"lahore"}}'

# Schedule (fixed future time)
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <secret_rest_key>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Later","body":"Scheduled","target_type":"all","scheduled_at":"2026-08-04T18:00:00Z"}'
```

## Dashboard UI
- `/login` — Supabase Auth (email/password). Create users in Supabase → Authentication → Users.
- `/apps` — create an app, upload the FCM service-account JSON, public/secret keys (secret shown only once).
- `/compose` — title/body/image/launch/data, target (All / Tags / External IDs), send now or schedule.
- `/notifications` — list + sent/failed/clicks/CTR.

## Status
- ✅ Backend API (apps, devices, tags, login, events, notifications, cron) — builds clean
- ✅ Flutter SDK — analyze clean
- ✅ Dashboard UI (login, apps, compose, notifications+analytics) — builds clean
- Phase 2: in-app messages, email/SMS, A/B, confirmed-delivery, dedicated queue, saved segments, action buttons

Full spec: [SPECS.md](SPECS.md).
