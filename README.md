# Notification SDK — Self-hosted Push Platform

Apna OneSignal-jaisa push notification system. Directly FCM use karta hai (iOS bhi FCM→APNs relay se). OneSignal paid ho gaya, yeh uska self-hosted replacement hai.

```
├── SPECS.md            # Poora technical specification (single source of truth)
├── supabase/
│   └── schema.sql      # Postgres schema — Supabase SQL editor mein run karo
├── dashboard/          # Next.js app (API + dashboard UI), Vercel pe deploy
└── my_push/            # Flutter SDK (private git package)
```

## Teen hisse

1. **`my_push` Flutter SDK** — app ke andar: registration, tags, login, notification handling. Dekho [my_push/README.md](my_push/README.md).
2. **Backend API** — `dashboard/src/app/api/*` — devices, notifications, transactional send, cron dispatch.
3. **Dashboard** — Next.js UI (compose, target, schedule, analytics).

## Quick Setup

### 1. Supabase
- Supabase project banao → SQL editor mein [supabase/schema.sql](supabase/schema.sql) run karo.
- Project settings se: `URL`, `anon key`, `service_role key` lo.

### 2. Dashboard (`dashboard/`)
```bash
cd dashboard
cp .env.example .env.local     # values bharo
npm install
npm run dev
```
`.env.local` keys:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CREDENTIALS_ENCRYPTION_KEY` = `openssl rand -hex 32`
- `CRON_SECRET` = `openssl rand -hex 32`
- `ADMIN_SETUP_TOKEN` = `openssl rand -hex 32`

### 3. App banao + FCM creds
Firebase Console → Project Settings → Service Accounts → **Generate new private key** (JSON download). Phir:
```bash
curl -X POST http://localhost:3000/api/apps \
  -H "X-Admin-Token: $ADMIN_SETUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","fcm_service_account": <paste serviceAccount JSON> }'
```
Response mein `public_app_key` (SDK ke liye) aur `secret_rest_key` (sending ke liye) milenge. **Secret key sirf ek baar dikhti hai.**

### 3b. Firebase client config (zero-config SDK — OneSignal jaisa)
Taake app mein `flutterfire configure` / `google-services.json` na karna pare:
- Dashboard → **Apps** → apni app → **Set up Firebase config**
- Android ka `google-services.json` aur/ya iOS ka `GoogleService-Info.plist` **paste** karo (Firebase Console → Project Settings → Your apps se)
- SDK ye config `GET /api/config` se le kar khud `Firebase.initializeApp()` kar leti hai

### 4. Flutter app
`my_push` package add karo, sirf `public_app_key` + dashboard URL se initialize karo — app mein Firebase ki manual setup nahi chahiye. Details: [my_push/README.md](my_push/README.md).

### 5. Deploy (Vercel)
`dashboard/` ko Vercel pe deploy karo. Env vars set karo. `vercel.json` mein cron (`/api/cron/dispatch` har minute) already hai.

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
- `/login` — Supabase Auth (email/password). User Supabase → Authentication → Users mein banao.
- `/apps` — app banao, FCM service-account JSON upload, public/secret keys (secret sirf ek baar).
- `/compose` — title/body/image/launch/data, target (All / Tags / External IDs), send now ya schedule.
- `/notifications` — list + sent/failed/clicks/CTR.

## Status
- ✅ Backend API (apps, devices, tags, login, events, notifications, cron) — builds clean
- ✅ Flutter SDK — analyze clean
- ✅ Dashboard UI (login, apps, compose, notifications+analytics) — builds clean
- Phase 2: in-app messages, email/SMS, A/B, confirmed-delivery, dedicated queue, saved segments, action buttons

Full spec: [SPECS.md](SPECS.md).
