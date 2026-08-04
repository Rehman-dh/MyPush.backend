import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { dispatchNotification } from "@/lib/delivery";
import type { AppRow } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/dispatch  — Vercel Cron (every minute).
 * Sends due scheduled notifications.
 * Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  // Atomic claim: scheduled → sending. RETURNING gives only the rows this run claimed,
  // so overlapping cron runs won't double-send the same notification.
  const { data: due, error } = await db
    .from("notifications")
    .update({ status: "sending" })
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due || due.length === 0) return NextResponse.json({ dispatched: 0 });

  // Cache app rows (multiple notifications may belong to the same app)
  const appCache = new Map<string, AppRow>();
  let dispatched = 0;

  for (const notif of due) {
    try {
      let app = appCache.get(notif.app_id);
      if (!app) {
        const { data } = await db.from("apps").select("*").eq("id", notif.app_id).maybeSingle();
        if (!data) continue;
        app = data as AppRow;
        appCache.set(notif.app_id, app);
      }
      await dispatchNotification(notif as any, app);
      dispatched++;
    } catch (e) {
      await db.from("notifications").update({ status: "failed" }).eq("id", notif.id);
    }
  }

  return NextResponse.json({ dispatched });
}
