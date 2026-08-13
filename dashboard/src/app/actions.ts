"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser } from "@/lib/supabase-server";
import { createApp, setAppFcmCredentials } from "@/lib/apps";
import { dispatchAndFinalize } from "@/lib/delivery";
import {
  parseGoogleServicesJson,
  parseGoogleServiceInfoPlist,
  FirebaseClientConfig,
} from "@/lib/firebase-config";
import type { AppRow } from "@/lib/auth";

async function requireAuth() {
  const user = await currentUser();
  if (!user) throw new Error("unauthorized");
  return user;
}

/** Read a FormData field that may be an uploaded File or a pasted string. */
async function readFileOrText(v: FormDataEntryValue | null): Promise<string> {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  // File/Blob (from <input type="file">)
  const file = v as File;
  if (file.size === 0) return "";
  return (await file.text()).trim();
}

export interface CreateAppResult {
  ok: boolean;
  error?: string;
  appId?: string;
  appName?: string;
  publicKey?: string;
  secretKey?: string;
}

/** Create a new app from the dashboard (FCM JSON optional). */
export async function createAppAction(
  _prev: unknown,
  formData: FormData
): Promise<CreateAppResult> {
  try {
    await requireAuth();
    const name = String(formData.get("name") || "").trim();
    if (!name) return { ok: false, error: "Name required" };

    let sa: Record<string, unknown> | undefined;
    const saText = await readFileOrText(formData.get("fcm_service_account"));
    if (saText) {
      try {
        sa = JSON.parse(saText);
      } catch {
        return { ok: false, error: "FCM service account JSON is invalid" };
      }
    }
    const app = await createApp(name, sa);
    revalidatePath("/apps");
    return {
      ok: true,
      appId: app.id,
      appName: app.name,
      publicKey: app.public_app_key,
      secretKey: app.secret_rest_key,
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/** Update/rotate an existing app's FCM credentials. */
export async function updateFcmAction(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAuth();
    const appId = String(formData.get("app_id") || "");
    const saText = await readFileOrText(formData.get("fcm_service_account"));
    if (!appId || !saText) return { ok: false, error: "Select the FCM service-account JSON file" };
    let sa: Record<string, unknown>;
    try {
      sa = JSON.parse(saText);
    } catch {
      return { ok: false, error: "FCM service account JSON is invalid" };
    }
    await setAppFcmCredentials(appId, sa);
    revalidatePath("/apps");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/**
 * Save the Firebase client config for an app by parsing the developer's
 * google-services.json (Android) and/or GoogleService-Info.plist (iOS).
 * This powers the zero-config SDK init (no flutterfire/google-services in the app).
 */
export async function setFirebaseConfigAction(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAuth();
    const appId = String(formData.get("app_id") || "");
    if (!appId) return { ok: false, error: "app_id required" };

    const androidText = await readFileOrText(formData.get("google_services_json"));
    const iosText = await readFileOrText(formData.get("google_service_info_plist"));
    if (!androidText && !iosText) {
      return { ok: false, error: "Select at least one config file" };
    }

    const config: FirebaseClientConfig = {};
    if (androidText) {
      try {
        config.android = parseGoogleServicesJson(androidText);
      } catch (e: any) {
        return { ok: false, error: "Android: " + e.message };
      }
    }
    if (iosText) {
      try {
        config.ios = parseGoogleServiceInfoPlist(iosText);
      } catch (e: any) {
        return { ok: false, error: "iOS: " + e.message };
      }
    }

    const db = supabaseAdmin();
    // Merge with existing (so setting one platform doesn't wipe the other).
    const { data: existing } = await db
      .from("apps")
      .select("firebase_client_config")
      .eq("id", appId)
      .single();
    const merged = {
      ...((existing?.firebase_client_config as object) ?? {}),
      ...config,
    };

    const { error } = await db
      .from("apps")
      .update({ firebase_client_config: merged })
      .eq("id", appId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/apps");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export interface SendResult {
  ok: boolean;
  error?: string;
  status?: string;
  sent?: number;
  failed?: number;
}

/**
 * Send/schedule a notification from the dashboard.
 * The rich compose form serializes its whole state to a single `payload` JSON
 * field, so this action reads one structured object rather than many flat keys.
 */
export async function sendNotificationAction(
  _prev: unknown,
  formData: FormData
): Promise<SendResult> {
  try {
    await requireAuth();
    const db = supabaseAdmin();

    let p: any;
    try {
      p = JSON.parse(String(formData.get("payload") || "{}"));
    } catch {
      return { ok: false, error: "Invalid form payload" };
    }

    const appId = String(p.app_id || "");
    const title = String(p.title || "").trim();
    const body = String(p.body || "").trim();
    if (!appId || !title || !body) return { ok: false, error: "app, title, body required" };

    const targetType = (["all", "tags", "external_ids"].includes(p.target_type)
      ? p.target_type
      : "all") as "all" | "tags" | "external_ids";

    let targetFilter: any = targetType === "external_ids" ? [] : {};
    if (targetType === "tags" && p.target_filter && typeof p.target_filter === "object") {
      targetFilter = p.target_filter;
    } else if (targetType === "external_ids" && Array.isArray(p.target_filter)) {
      targetFilter = p.target_filter.map((s: unknown) => String(s).trim()).filter(Boolean);
    }

    const platforms: string[] =
      Array.isArray(p.platforms) && p.platforms.length ? p.platforms : ["android", "ios"];

    const data: Record<string, string> =
      p.data && typeof p.data === "object" && !Array.isArray(p.data) ? p.data : {};
    const options = p.options && typeof p.options === "object" ? p.options : {};

    // Delivery mode
    const mode = (["now", "fixed", "timezone"].includes(p?.delivery?.mode)
      ? p.delivery.mode
      : "now") as "now" | "fixed" | "timezone";

    let status = "sending";
    let scheduledAtIso: string | null = null;
    let tzLocal: string | null = null;
    let tzDate: string | null = null;

    if (mode === "fixed") {
      const at = p.delivery.scheduled_at ? new Date(p.delivery.scheduled_at) : null;
      if (at && at.getTime() > Date.now()) {
        status = "scheduled";
        scheduledAtIso = at.toISOString();
      } else {
        status = "sending"; // past/empty time → send now
      }
    } else if (mode === "timezone") {
      if (!p.delivery.tz_send_local || !p.delivery.tz_send_date) {
        return { ok: false, error: "Timezone delivery needs a date and local time" };
      }
      status = "scheduling";
      tzLocal = String(p.delivery.tz_send_local);
      tzDate = String(p.delivery.tz_send_date);
    }

    const { data: notif, error } = await db
      .from("notifications")
      .insert({
        app_id: appId,
        name: p.name ? String(p.name).trim() : null,
        title,
        subtitle: p.subtitle ? String(p.subtitle).trim() : null,
        body,
        image_url: p.image_url ? String(p.image_url).trim() : null,
        launch_url: p.launch_url ? String(p.launch_url).trim() : null,
        data,
        platforms,
        options,
        target_type: targetType,
        target_filter: targetFilter,
        status,
        delivery_mode: mode === "fixed" && status === "sending" ? "now" : mode,
        scheduled_at: scheduledAtIso,
        tz_send_local: tzLocal,
        tz_send_date: tzDate,
      })
      .select("*")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/apps/${appId}/notifications`);

    if (status === "scheduled") return { ok: true, status: "scheduled" };
    if (status === "scheduling") return { ok: true, status: "scheduled" };

    // Send now
    const { data: app } = await db.from("apps").select("*").eq("id", appId).single();
    const result = await dispatchAndFinalize(notif as any, app as AppRow);
    revalidatePath(`/apps/${appId}/notifications`);
    return { ok: true, status: "completed", ...result };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
