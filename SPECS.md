# Push Notification System — Technical Specification (v1)

> Apna OneSignal-jaisa self-hosted push notification platform.
> Yeh document implementation ka **single source of truth** hai.
> Status: v1 spec — discussion se finalized.

---

## 1. Context & Goal

Humare paas Flutter app(s) hain jo abhi `onesignal_flutter` use karti hain. OneSignal paid ho gaya hai, is liye hum apna equivalent bana rahe hain jo **directly Firebase Cloud Messaging (FCM)** use kare — iOS ke liye bhi FCM ke through (FCM → APNs relay). Yeh possible hai kyunki OneSignal khud bhi sirf FCM ka service-account JSON aur APNs ka `.p8` key use karta hai; in credentials par koi lock-in nahi. Wahi credentials use karke hum same functionality khud host kar sakte hain.

**Teen deliverables:**
1. **`my_push` Flutter SDK** — app ke andar (registration, tags, login, notification handling).
2. **Backend API** — Next.js route handlers (device management, sending, delivery pipeline).
3. **Dashboard** — Next.js UI (compose, target, schedule, analytics). Backend + Dashboard ek hi Next.js app, Vercel pe deploy.

---

## 2. Locked Decisions

| Area | Decision |
|------|----------|
| **Platforms** | Android (FCM) + iOS. iOS = **FCM relay** (APNs `.p8` Firebase console mein upload; backend sirf FCM HTTP v1). Web push nahi. |
| **Scope** | Single owner, **multi-app** (kai apps ek dashboard se manage). Public SaaS signup nahi. |
| **Scale** | <10k devices/app → Vercel serverless + batched sending kaafi. Dedicated queue phase 2. |
| **Database** | Supabase (Postgres). |
| **SDK auth** | Public **App Key** (device registration + client calls) + secret **REST Key** (sending/admin — sirf server-side). |
| **Notification features v1** | title, body, image, deep-link/launch URL, custom data payload. Action buttons NAHI. |
| **Dead tokens** | Auto-unsubscribe: FCM `UNREGISTERED`/invalid → `subscribed=false`. |
| **Targeting** | Tags (key=value). Sirf **equality + AND**. Ad-hoc filters (koi saved segments nahi). |
| **User targeting** | `login(externalId)` / `logout()`. Send to user ke **SAB** subscribed devices. **Transactional REST API** v1 mein. |
| **In-app handling** | `requestPermission()`; foreground → system notification dikhao; click → SDK `data` de, app khud navigate kare. |
| **Scheduling** | Fixed-time only. Vercel Cron `/api/cron/dispatch`. Per-user timezone NAHI. |
| **Analytics** | Sent / Failed + Clicks. Confirmed-delivered = phase 2. |
| **Dashboard auth** | Supabase Auth (email/password). Admin + team, koi public signup nahi. |
| **SDK distribution** | Private Git package (`pubspec.yaml` git URL). |
| **Out of v1** | In-app messages, Email/SMS channels, A/B testing & automation/journeys, confirmed-delivery analytics. |

---

## 3. Architecture

```
┌──────────────┐   register / tags / login / events   ┌───────────────────────────┐
│ Flutter App  │ ───────────────────────────────────► │  Next.js API (Vercel)     │
│  my_push SDK │ ◄───────── push notification ──────┐  │  route handlers           │
└──────────────┘                                    │  └─────────────┬─────────────┘
        ▲                                           │                │ firebase-admin
        │ FCM (iOS via APNs relay)                  │                ▼
┌──────────────┐                                    │        ┌──────────────┐
│     FCM      │ ◄──────────────────────────────────┘        │     FCM      │
└──────────────┘                                             └──────────────┘
                                                                    │
┌──────────────────────┐   read/write   ┌──────────────────┐        │
│  Dashboard (Next.js) │ ─────────────► │ Supabase Postgres │ ◄──────┘ (device rows,
│  Supabase Auth       │                └──────────────────┘           counters)
└──────────────────────┘                        ▲
                          Vercel Cron (every 1 min) ──► /api/cron/dispatch
```

**Delivery flow:** Dashboard/API notification banata hai → backend audience resolve karta hai → device tokens fetch → `firebase-admin` se FCM ko 500-token batches mein bhejta hai → per-token result process (invalid → unsubscribe) → counters update.

---

## 4. Tech Stack

| Layer | Choice |
|-------|--------|
| Flutter SDK | Dart package `my_push`; deps: `firebase_messaging`, `flutter_local_notifications`, `http`, `shared_preferences` |
| Backend + Dashboard | Next.js (App Router) + TypeScript, Vercel |
| Push sending | `firebase-admin` (Node) — FCM HTTP v1, OAuth service-account se auto |
| Database | Supabase Postgres (`@supabase/supabase-js`) |
| Dashboard auth | Supabase Auth (email/password) |
| Scheduling | Vercel Cron → `/api/cron/dispatch` |
| Secrets | FCM service-account JSON encrypted-at-rest in `apps` table; encryption key Vercel env var |

---

## 5. Data Model (Postgres)

### `apps`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | app ka naam |
| public_app_key | text unique | client SDK mein embedded |
| secret_rest_key_hash | text | secret REST key ka hash (plaintext sirf create pe dikhta hai) |
| fcm_service_account | jsonb (encrypted) | Firebase service-account JSON (sending ke liye) |
| firebase_client_config | jsonb | `{ android?, ios? }` FirebaseOptions — zero-config SDK init ke liye (secret nahi) |
| created_at | timestamptz | |

### `devices`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | subscription id (OneSignal `player_id` equivalent) |
| app_id | uuid FK → apps | |
| push_token | text | FCM registration token |
| platform | text | `android` \| `ios` |
| external_user_id | text null | app ka apna user id (login se) |
| tags | jsonb | `{"city":"lahore","plan":"premium"}` |
| language | text null | |
| timezone | text null | |
| os_version | text null | |
| app_version | text null | |
| device_model | text null | |
| subscribed | bool | default true; dead token → false |
| last_active_at | timestamptz | |
| created_at | timestamptz | |

Indexes: `UNIQUE(app_id, id)`, `INDEX(app_id, external_user_id)`, `INDEX(app_id, push_token)`, **GIN** `(tags)`.

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| app_id | uuid FK → apps | |
| title | text | |
| body | text | |
| image_url | text null | |
| launch_url | text null | deep link / URL |
| data | jsonb | custom key-value payload |
| target_type | text | `all` \| `tags` \| `external_ids` |
| target_filter | jsonb | tags: `{"city":"lahore"}`; external_ids: `["4821","99"]` |
| status | text | `scheduled` \| `sending` \| `completed` \| `failed` |
| scheduled_at | timestamptz null | future = scheduled |
| sent_count | int default 0 | |
| failed_count | int default 0 | |
| clicked_count | int default 0 | |
| created_at | timestamptz | |

### `events` (optional detail; counters primary)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| notification_id | uuid FK → notifications | |
| device_id | uuid null | |
| type | text | `clicked` (v1) |
| created_at | timestamptz | |

---

## 6. Component 1 — Flutter SDK (`my_push`)

OneSignal-mimic public API, simple aur minimal.

**Zero-config Firebase init:** `initialize()` default pe backend se `GET /api/config` le kar khud `Firebase.initializeApp(options:)` call karti hai — app ko `flutterfire configure` / `google-services.json` / `GoogleService-Info.plist` ki zaroorat nahi. Agar app khud Firebase init karti hai to `autoInitializeFirebase: false` pass karo. (Dashboard mein Firebase client config parse hota hai `google-services.json` + `GoogleService-Info.plist` paste se — [firebase-config.ts](dashboard/src/lib/firebase-config.ts).)


```dart
// Initialization (app start)
await MyPush.initialize(
  appKey: 'pub_xxx',                 // public App Key
  apiBaseUrl: 'https://dash.vercel.app',
);

// Permission
await MyPush.requestPermission();     // iOS + Android 13+

// User identity
await MyPush.login('4821');           // set external_user_id
await MyPush.logout();                // clear

// Tags
await MyPush.setTag('city', 'lahore');
await MyPush.setTags({'plan': 'premium', 'city': 'lahore'});
await MyPush.deleteTag('city');

// Click handling (app navigate karega)
MyPush.onNotificationClick((data) {
  // data e.g. { "screen": "order", "order_id": "A-100", "notification_id": "..." }
});
```

**Internal behaviour:**
- **Device identity:** local UUID `shared_preferences` mein store (`my_push_device_id`). Yehi `devices.id` banega.
- **Registration:** init pe FCM token lo → `POST /api/devices` (upsert). `FirebaseMessaging.onTokenRefresh` pe re-send.
- **Foreground:** `FirebaseMessaging.onMessage` → `flutter_local_notifications` se heads-up banner dikhao (default). Suppress-callback bhi expose.
- **Click:** `onMessageOpenedApp` (background) + `getInitialMessage()` (terminated) → `onNotificationClick(data)` call; saath hi `POST /api/events` type=`clicked` with `notification_id`.
- **iOS setup (config, code nahi):** APNs `.p8` auth key Firebase console → Project Settings → Cloud Messaging mein upload. Xcode: Push Notifications + Background Modes capability.

---

## 7. Component 2 — Backend API (Next.js route handlers)

Auth: client endpoints `public_app_key` header se; admin/send endpoints `secret_rest_key` (Bearer) se; dashboard reads Supabase Auth session se.

### Client endpoints (public App Key)
**`GET /api/config`** — Firebase client options (`{ android?, ios? }`) for zero-config SDK init. Header `X-App-Key`. Not secret.

**`POST /api/devices`** — register/upsert device
```jsonc
// req
{ "device_id": "uuid", "push_token": "...", "platform": "android",
  "app_version": "1.2.0", "os_version": "14", "language": "ur",
  "timezone": "Asia/Karachi", "device_model": "Pixel 7" }
// res
{ "id": "uuid", "subscribed": true }
```
Header: `X-App-Key: pub_xxx`. Behaviour: `app_id` resolve from key → upsert on `(app_id, id)`; `last_active_at` update.

**`PATCH /api/devices/{id}`** — external_user_id set/clear
```jsonc
{ "external_user_id": "4821" }   // null = logout
```

**`PATCH /api/devices/{id}/tags`** — merge/delete tags
```jsonc
{ "set": { "city": "lahore" }, "delete": ["plan"] }
```

**`POST /api/events`** — click report
```jsonc
{ "notification_id": "uuid", "device_id": "uuid", "type": "clicked" }
```
→ `events` insert + `notifications.clicked_count` increment.

### Admin/send endpoints (secret REST Key)
**`POST /api/notifications`** — create + send/schedule
```jsonc
// req  (Authorization: Bearer <secret_rest_key>)
{
  "title": "Order shipped 📦",
  "body": "Aapka order raste mein hai",
  "image_url": null,
  "launch_url": null,
  "data": { "screen": "order", "order_id": "A-100" },
  "target_type": "external_ids",          // all | tags | external_ids
  "target_filter": ["4821"],              // tags: {"city":"lahore"} | external_ids: [...]
  "scheduled_at": null                    // ISO string = schedule; null = send now
}
// res
{ "id": "uuid", "status": "sending" }      // ya "scheduled"
```

**`GET /api/notifications`** — dashboard list (auth session). Query by app_id, counts included.

### Cron
**`GET /api/cron/dispatch`** — Vercel Cron (every minute). Query `status='scheduled' AND scheduled_at <= now()` → each ko delivery pipeline se bhejo. Header secret se protect (Vercel Cron secret).

### Delivery pipeline (shared internal function)
```
1. notification.status = 'sending'
2. audience resolve:
   - all         → SELECT push_token,id FROM devices WHERE app_id=? AND subscribed=true
   - tags        → ... AND tags @> {equality pairs}   (AND of key=value)
   - external_ids→ ... AND external_user_id IN (...)
3. tokens ko 500 ke chunks mein baanto
4. har chunk: firebase-admin messaging().sendEachForMulticast({ tokens, notification, data, android, apns })
     - notification: { title, body, image }
     - data: { ...customData, notification_id, launch_url }
5. per-token response:
     - success  → sent_count++
     - error code messaging/registration-token-not-registered | invalid-argument
                → failed_count++, us device.subscribed = false
     - baaki error → failed_count++
6. notification.status = 'completed', counts persist
```
FCM instance per-app cache (service-account JSON decrypt → `admin.initializeApp` named app).

---

## 8. Component 3 — Dashboard (Next.js + Supabase Auth)

| Page | Content |
|------|---------|
| **Login** | Supabase Auth (email/password). |
| **App switcher** | Top bar mein active app select (multi-app). |
| **Apps** | App create; FCM service-account JSON upload (encrypt + store); public App Key + secret REST Key dikhao (secret sirf ek baar). |
| **Compose / Send** | Fields: title, body, image URL, launch URL, custom data (key-value rows). Target: `All` / `Tags` (key=value AND rows) / `External IDs` (list). Send now ya schedule (datetime picker). |
| **Notifications** | List: title, target, status, sent/failed/clicked counts, CTR (clicked/sent), created time. |
| **Devices** | Registered devices: platform, external_user_id, tags, subscribed filter, last active. |

---

## 9. Scheduling

- Compose pe "Send later" → `scheduled_at` set → `status='scheduled'` (bheja nahi jata).
- `vercel.json` mein cron: `/api/cron/dispatch` har minute.
- Cron endpoint due notifications ko delivery pipeline se process karta hai (same code as send-now).
- Fixed-time only — sab recipients ko ek hi lamhe.

---

## 10. Analytics (v1)

| Metric | Source |
|--------|--------|
| Sent | FCM success responses (delivery pipeline) |
| Failed | FCM error responses |
| Clicked | SDK `POST /api/events` on tap → `clicked_count` |
| CTR | clicked / sent (dashboard computed) |

Confirmed-delivered (device pe actual receipt) = **phase 2** (iOS Notification Service Extension + Android background handler needed).

---

## 11. Security Notes

- **Public App Key**: client-safe; sirf device registration/tags/events allow karta hai (koi sending nahi).
- **Secret REST Key**: sirf server-side; sending/admin. Dashboard aur app ke apne backend mein hi rakhna.
- **FCM service-account JSON**: `apps` table mein encrypted (AES-GCM), key Vercel env var. Kabhi client ko expose nahi.
- Rate-limit registration/events endpoints (basic).
- Cron endpoint Vercel Cron secret se protected.

---

## 12. Build Order

0. **Yeh SPECS.md** — done (single source of truth).
1. Supabase schema (tables + indexes) + ek `apps` row seed + FCM creds.
2. Backend core: `/api/devices`, delivery pipeline, `/api/notifications` (send-now, target=all).
3. Flutter SDK: init + registration + permission + foreground/click. End-to-end send-to-all test (real device).
4. Targeting: tags SDK + equality filter; external_id/login + transactional API test.
5. Dashboard: auth, apps, compose/send, notifications list, analytics (clicks).
6. Scheduling: `scheduled_at` + Vercel Cron dispatch.
7. Multi-app polish + SDK private git package publish + Vercel deploy.

---

## 13. Verification (end-to-end)

| Test | Expected |
|------|----------|
| Registration | App chalao → Supabase `devices` mein row (token, platform). |
| Send-to-all | Dashboard se bhejo → real device pe notification; `sent_count` badhe. |
| Foreground | App khuli ho tab bhi heads-up banner dikhe. |
| Click | Tap → app ko deep-link `data` mile → `events` mein clicked → dashboard `clicked_count` badhe. |
| Tags | `setTag("city","lahore")` → send filter city=lahore → sirf wahi device paye. |
| External id / transactional | `login("4821")` → `POST /api/notifications` external_ids=["4821"] (curl) → us user ke sab devices pe aaye. |
| Dead token | Purana/invalid token → send → wo device `subscribed=false`. |
| Scheduling | 2 min future schedule → Vercel Cron se time pe deliver. |
| iOS | Real iPhone pe FCM relay se notification (APNs `.p8` Firebase upload hone ke baad). |

---

## 14. Phase 2 (baad mein)

In-app messages · Email/SMS channels · A/B testing & automation/journeys · Confirmed-delivery analytics · Dedicated queue/worker (scale > 10k) · Saved segments · Rich filter operators (>, <, OR, exists) · Per-user timezone scheduling · Action buttons.
