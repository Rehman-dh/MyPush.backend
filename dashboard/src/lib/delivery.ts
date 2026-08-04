import { supabaseAdmin } from "./supabase";
import { getMessagingForApp, isUnregisteredError } from "./fcm";
import { EncryptedBlob } from "./crypto";
import type { AppRow } from "./auth";

const FCM_BATCH = 500; // sendEachForMulticast max tokens per call

interface NotificationRow {
  id: string;
  app_id: string;
  title: string;
  body: string;
  image_url: string | null;
  launch_url: string | null;
  data: Record<string, string>;
  target_type: "all" | "tags" | "external_ids";
  target_filter: Record<string, unknown> | string[];
}

interface DeviceRef {
  id: string;
  push_token: string;
}

/** Resolve the audience → list of { id, push_token }. */
async function resolveAudience(n: NotificationRow): Promise<DeviceRef[]> {
  const db = supabaseAdmin();
  let q = db
    .from("devices")
    .select("id, push_token")
    .eq("app_id", n.app_id)
    .eq("subscribed", true);

  if (n.target_type === "tags") {
    // Equality + AND: tags @> {"city":"lahore", ...}
    q = q.contains("tags", n.target_filter as Record<string, unknown>);
  } else if (n.target_type === "external_ids") {
    const ids = (n.target_filter as string[]) ?? [];
    if (ids.length === 0) return [];
    q = q.in("external_user_id", ids);
  }
  // target_type === 'all' → no extra filter

  const { data, error } = await q;
  if (error) throw new Error("audience resolve failed: " + error.message);
  return (data as DeviceRef[]) ?? [];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Send one notification (called by both send-now and cron dispatch).
 * Updates counts and unsubscribes dead tokens.
 */
export async function dispatchNotification(
  notification: NotificationRow,
  app: AppRow
): Promise<{ sent: number; failed: number }> {
  const db = supabaseAdmin();

  if (!app.fcm_service_account) {
    await db.from("notifications").update({ status: "failed" }).eq("id", notification.id);
    throw new Error("app has no FCM service account configured");
  }

  await db.from("notifications").update({ status: "sending" }).eq("id", notification.id);

  const audience = await resolveAudience(notification);
  if (audience.length === 0) {
    await db
      .from("notifications")
      .update({ status: "completed", sent_count: 0, failed_count: 0 })
      .eq("id", notification.id);
    return { sent: 0, failed: 0 };
  }

  const messaging = getMessagingForApp(
    notification.app_id,
    app.fcm_service_account as EncryptedBlob
  );

  // data payload: all values must be strings (FCM requirement). Include notification_id + launch_url.
  const dataPayload: Record<string, string> = {
    notification_id: notification.id,
    ...(notification.launch_url ? { launch_url: notification.launch_url } : {}),
    ...Object.fromEntries(
      Object.entries(notification.data || {}).map(([k, v]) => [k, String(v)])
    ),
  };

  let sent = 0;
  let failed = 0;
  const deadTokens: string[] = [];

  for (const group of chunk(audience, FCM_BATCH)) {
    const tokens = group.map((d) => d.push_token);
    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.image_url ? { imageUrl: notification.image_url } : {}),
      },
      data: dataPayload,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });

    resp.responses.forEach((r, i) => {
      if (r.success) {
        sent++;
      } else {
        failed++;
        if (isUnregisteredError(r.error?.code)) deadTokens.push(tokens[i]);
      }
    });
  }

  // Dead tokens auto-unsubscribe
  if (deadTokens.length > 0) {
    await db
      .from("devices")
      .update({ subscribed: false })
      .eq("app_id", notification.app_id)
      .in("push_token", deadTokens);
  }

  await db
    .from("notifications")
    .update({ status: "completed", sent_count: sent, failed_count: failed })
    .eq("id", notification.id);

  return { sent, failed };
}
