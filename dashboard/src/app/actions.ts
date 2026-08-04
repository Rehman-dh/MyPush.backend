"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { currentUser } from "@/lib/supabase-server";
import { createApp, setAppFcmCredentials } from "@/lib/apps";
import { dispatchNotification } from "@/lib/delivery";
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
    return { ok: true, publicKey: app.public_app_key, secretKey: app.secret_rest_key };
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

/** Send/schedule a notification from the dashboard. */
export async function sendNotificationAction(
  _prev: unknown,
  formData: FormData
): Promise<SendResult> {
  try {
    await requireAuth();
    const db = supabaseAdmin();

    const appId = String(formData.get("app_id") || "");
    const title = String(formData.get("title") || "").trim();
    const body = String(formData.get("body") || "").trim();
    if (!appId || !title || !body) return { ok: false, error: "app, title, body required" };

    const targetType = String(formData.get("target_type") || "all") as
      | "all"
      | "tags"
      | "external_ids";

    let targetFilter: any = {};
    if (targetType === "tags") {
      const raw = String(formData.get("target_filter") || "{}");
      try {
        targetFilter = JSON.parse(raw);
      } catch {
        return { ok: false, error: "Invalid tags filter JSON (e.g. {\"city\":\"lahore\"})" };
      }
    } else if (targetType === "external_ids") {
      targetFilter = String(formData.get("target_filter") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    let data: Record<string, string> = {};
    const dataRaw = String(formData.get("data") || "").trim();
    if (dataRaw) {
      try {
        data = JSON.parse(dataRaw);
      } catch {
        return { ok: false, error: "Invalid custom data JSON" };
      }
    }

    const scheduledRaw = String(formData.get("scheduled_at") || "").trim();
    const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : null;
    const isScheduled = scheduledAt !== null && scheduledAt.getTime() > Date.now();

    const { data: notif, error } = await db
      .from("notifications")
      .insert({
        app_id: appId,
        title,
        body,
        image_url: String(formData.get("image_url") || "").trim() || null,
        launch_url: String(formData.get("launch_url") || "").trim() || null,
        data,
        target_type: targetType,
        target_filter: targetFilter,
        status: isScheduled ? "scheduled" : "sending",
        scheduled_at: isScheduled ? scheduledAt!.toISOString() : null,
      })
      .select("*")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/notifications");
    if (isScheduled) return { ok: true, status: "scheduled" };

    const { data: app } = await db.from("apps").select("*").eq("id", appId).single();
    const result = await dispatchNotification(notif as any, app as AppRow);
    revalidatePath("/notifications");
    return { ok: true, status: "completed", ...result };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
