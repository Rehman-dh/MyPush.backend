import { supabaseAdmin } from "./supabase";
import { getMessagingForApp, isUnregisteredError } from "./fcm";
import { EncryptedBlob } from "./crypto";
import type { AppRow } from "./auth";
import type { messaging } from "firebase-admin";

const FCM_BATCH = 500; // sendEachForMulticast max tokens per call

export interface ActionButton {
  id: string;
  text: string;
  icon?: string;
  systemIcon?: boolean;
}

export interface NotificationOptions {
  ios?: {
    badge?: number | null;
    sound?: string;
    contentAvailable?: boolean;
    interruptionLevel?: "active" | "passive" | "time-sensitive" | "critical";
  };
  android?: {
    bigPicture?: string;
    smallIcon?: string;
    largeIcon?: string;
    sound?: string;
    visibility?: "private" | "public" | "secret";
    accentColor?: string;
    channelId?: string;
  };
  advanced?: {
    collapseId?: string;
    priority?: "normal" | "high";
    ttlSeconds?: number;
  };
  buttons?: ActionButton[];
}

export interface NotificationRow {
  id: string;
  app_id: string;
  title: string;
  subtitle: string | null;
  body: string;
  image_url: string | null;
  launch_url: string | null;
  data: Record<string, string>;
  platforms: string[] | null;
  options: NotificationOptions | null;
  target_type: "all" | "tags" | "external_ids";
  target_filter: Record<string, unknown> | string[];
}

interface DeviceRef {
  id: string;
  push_token: string;
}

export interface DispatchOpts {
  /** Restrict to a single device timezone (per-timezone delivery). */
  timezone?: string;
  /** Restrict to devices whose timezone is null/empty (fallback bucket). */
  nullTimezone?: boolean;
}

/**
 * Base device query with app + subscribed + platform + target filters applied
 * (but not timezone). Returns null when the audience is trivially empty.
 */
function filteredDeviceQuery(select: string, n: NotificationRow) {
  const db = supabaseAdmin();
  let q = db
    .from("devices")
    .select(select)
    .eq("app_id", n.app_id)
    .eq("subscribed", true);

  const platforms = n.platforms && n.platforms.length ? n.platforms : ["android", "ios"];
  if (platforms.length === 1) q = q.eq("platform", platforms[0]);

  if (n.target_type === "tags") {
    q = q.contains("tags", n.target_filter as Record<string, unknown>);
  } else if (n.target_type === "external_ids") {
    const ids = (n.target_filter as string[]) ?? [];
    if (ids.length === 0) return null;
    q = q.in("external_user_id", ids);
  }
  return q;
}

/** Resolve the audience → list of { id, push_token }, honouring platform + timezone filters. */
async function resolveAudience(
  n: NotificationRow,
  opts: DispatchOpts = {}
): Promise<DeviceRef[]> {
  let q = filteredDeviceQuery("id, push_token", n);
  if (!q) return [];

  if (opts.timezone) q = q.eq("timezone", opts.timezone);
  else if (opts.nullTimezone) q = q.is("timezone", null);

  const { data, error } = await q;
  if (error) throw new Error("audience resolve failed: " + error.message);
  return (data as unknown as DeviceRef[]) ?? [];
}

/** Distinct device timezones in a notification's audience (+ whether any are null). */
export async function audienceTimezones(
  n: NotificationRow
): Promise<{ zones: string[]; hasNull: boolean }> {
  const q = filteredDeviceQuery("timezone", n);
  if (!q) return { zones: [], hasNull: false };
  const { data, error } = await q;
  if (error) throw new Error("timezone resolve failed: " + error.message);
  const set = new Set<string>();
  let hasNull = false;
  for (const r of (data as unknown as { timezone: string | null }[]) ?? []) {
    if (r.timezone) set.add(r.timezone);
    else hasNull = true;
  }
  return { zones: [...set], hasNull };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Build the per-message payload (everything except `tokens`) from a notification row.
 *
 * Button rule: when action buttons are present we send a **data-only** Android
 * payload (no top-level/android `notification`) so the SDK builds the notification
 * with actions; iOS still gets an `apns.alert` + `category` so the system shows it.
 */
export function buildFcmMessage(n: NotificationRow): Omit<messaging.MulticastMessage, "tokens"> {
  const opts = n.options ?? {};
  const ios = opts.ios ?? {};
  const android = opts.android ?? {};
  const adv = opts.advanced ?? {};
  const buttons = opts.buttons ?? [];
  const hasButtons = buttons.length > 0;

  const priorityHigh = (adv.priority ?? "high") !== "normal";
  const ttlMs = adv.ttlSeconds != null ? adv.ttlSeconds * 1000 : undefined;

  // data payload — all values must be strings (FCM requirement)
  const data: Record<string, string> = {
    notification_id: n.id,
    title: n.title,
    body: n.body,
    ...(n.subtitle ? { subtitle: n.subtitle } : {}),
    ...(android.bigPicture || n.image_url
      ? { image: android.bigPicture ?? n.image_url! }
      : {}),
    ...(android.largeIcon ? { large_icon: android.largeIcon } : {}),
    ...(android.accentColor ? { accent_color: android.accentColor } : {}),
    ...(android.sound ? { android_sound: android.sound } : {}),
    ...(n.launch_url ? { launch_url: n.launch_url } : {}),
    ...(hasButtons ? { buttons: JSON.stringify(buttons) } : {}),
    ...Object.fromEntries(
      Object.entries(n.data || {}).map(([k, v]) => [k, String(v)])
    ),
  };

  // ── Android block ──
  const androidBlock: messaging.AndroidConfig = {
    priority: priorityHigh ? "high" : "normal",
    ...(ttlMs != null ? { ttl: ttlMs } : {}),
    ...(adv.collapseId ? { collapseKey: adv.collapseId } : {}),
    ...(hasButtons
      ? {} // data-only → SDK builds the notification with actions
      : {
          notification: {
            imageUrl: android.bigPicture ?? n.image_url ?? undefined,
            ...(android.smallIcon ? { icon: android.smallIcon } : {}),
            ...(android.accentColor ? { color: android.accentColor } : {}),
            ...(android.sound ? { sound: android.sound } : {}),
            ...(android.visibility ? { visibility: android.visibility } : {}),
            ...(android.channelId ? { channelId: android.channelId } : {}),
          },
        }),
  };

  // ── iOS (APNs) block ──
  const aps: Record<string, unknown> = {
    alert: {
      title: n.title,
      ...(n.subtitle ? { subtitle: n.subtitle } : {}),
      body: n.body,
    },
    sound: ios.sound || "default",
    "mutable-content": 1,
    ...(ios.badge != null ? { badge: ios.badge } : {}),
    ...(ios.contentAvailable ? { "content-available": 1 } : {}),
    ...(ios.interruptionLevel ? { "interruption-level": ios.interruptionLevel } : {}),
    // Category groups the message's action buttons; the SDK registers it.
    ...(hasButtons ? { category: `mp_${n.id}` } : {}),
  };

  const apnsHeaders: Record<string, string> = {
    "apns-priority": priorityHigh ? "10" : "5",
    ...(adv.collapseId ? { "apns-collapse-id": adv.collapseId } : {}),
    ...(adv.ttlSeconds != null
      ? { "apns-expiration": String(Math.floor(Date.now() / 1000) + adv.ttlSeconds) }
      : {}),
  };

  const apnsBlock: messaging.ApnsConfig = {
    headers: apnsHeaders,
    payload: { aps: aps as messaging.Aps },
    ...(n.image_url
      ? { fcmOptions: { imageUrl: android.bigPicture ?? n.image_url } }
      : {}),
  };

  const message: Omit<messaging.MulticastMessage, "tokens"> = {
    data,
    android: androidBlock,
    apns: apnsBlock,
  };

  // Top-level notification only when there are no buttons (otherwise Android must
  // stay data-only so the SDK can attach action buttons).
  if (!hasButtons) {
    message.notification = {
      title: n.title,
      body: n.body,
      ...(n.image_url ? { imageUrl: n.image_url } : {}),
    };
  }

  return message;
}

/**
 * Send one notification (optionally to a platform/timezone subset).
 * Updates counts and unsubscribes dead tokens. Returns this run's counts.
 */
export async function dispatchNotification(
  notification: NotificationRow,
  app: AppRow,
  opts: DispatchOpts = {}
): Promise<{ sent: number; failed: number }> {
  const db = supabaseAdmin();

  if (!app.fcm_service_account) {
    await db.from("notifications").update({ status: "failed" }).eq("id", notification.id);
    throw new Error("app has no FCM service account configured");
  }

  const audience = await resolveAudience(notification, opts);
  if (audience.length === 0) return { sent: 0, failed: 0 };

  const messaging = getMessagingForApp(
    notification.app_id,
    app.fcm_service_account as EncryptedBlob
  );

  const base = buildFcmMessage(notification);

  let sent = 0;
  let failed = 0;
  const deadTokens: string[] = [];

  for (const group of chunk(audience, FCM_BATCH)) {
    const tokens = group.map((d) => d.push_token);
    const resp = await messaging.sendEachForMulticast({ ...base, tokens });
    resp.responses.forEach((r, i) => {
      if (r.success) sent++;
      else {
        failed++;
        if (isUnregisteredError(r.error?.code)) deadTokens.push(tokens[i]);
      }
    });
  }

  if (deadTokens.length > 0) {
    await db
      .from("devices")
      .update({ subscribed: false })
      .eq("app_id", notification.app_id)
      .in("push_token", deadTokens);
  }

  return { sent, failed };
}

/**
 * Send-now / fixed convenience: flips status to sending, dispatches to the full
 * audience, then persists final counts + completed status.
 */
export async function dispatchAndFinalize(
  notification: NotificationRow,
  app: AppRow
): Promise<{ sent: number; failed: number }> {
  const db = supabaseAdmin();
  await db.from("notifications").update({ status: "sending" }).eq("id", notification.id);
  try {
    const { sent, failed } = await dispatchNotification(notification, app);
    await db
      .from("notifications")
      .update({ status: "completed", sent_count: sent, failed_count: failed })
      .eq("id", notification.id);
    return { sent, failed };
  } catch (e) {
    await db.from("notifications").update({ status: "failed" }).eq("id", notification.id);
    throw e;
  }
}
