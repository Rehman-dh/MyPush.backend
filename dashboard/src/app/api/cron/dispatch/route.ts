import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  dispatchAndFinalize,
  dispatchNotification,
  audienceTimezones,
} from "@/lib/delivery";
import { isLocalTimeReached } from "@/lib/timezone";
import type { AppRow } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const NULL_TZ_KEY = "__null__";

/**
 * GET /api/cron/dispatch — driven by Supabase pg_cron (every minute).
 * Sends due fixed-time notifications and advances per-timezone notifications.
 * Protected by CRON_SECRET (Bearer).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const appCache = new Map<string, AppRow | null>();
  const getApp = async (appId: string): Promise<AppRow | null> => {
    if (appCache.has(appId)) return appCache.get(appId)!;
    const { data } = await db.from("apps").select("*").eq("id", appId).maybeSingle();
    const app = (data as AppRow) ?? null;
    appCache.set(appId, app);
    return app;
  };

  let dispatched = 0;

  // ── 1) Fixed-time sends: atomic claim scheduled → sending ──
  const { data: due, error } = await db
    .from("notifications")
    .update({ status: "sending" })
    .eq("status", "scheduled")
    .eq("delivery_mode", "fixed")
    .lte("scheduled_at", new Date().toISOString())
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const notif of due ?? []) {
    try {
      const app = await getApp(notif.app_id);
      if (!app) continue;
      await dispatchAndFinalize(notif as any, app);
      dispatched++;
    } catch {
      await db.from("notifications").update({ status: "failed" }).eq("id", notif.id);
    }
  }

  // ── 2) Per-timezone sends ──
  const now = new Date();
  const { data: tzNotifs } = await db
    .from("notifications")
    .select("*")
    .eq("delivery_mode", "timezone")
    .eq("status", "scheduling");

  for (const n of tzNotifs ?? []) {
    try {
      const app = await getApp(n.app_id);
      if (!app) continue;

      const { zones, hasNull } = await audienceTimezones(n as any);
      const targetKeys = [...zones, ...(hasNull ? [NULL_TZ_KEY] : [])];
      const completed = new Set<string>(
        Array.isArray(n.tz_completed) ? (n.tz_completed as string[]) : []
      );

      let sent = n.sent_count ?? 0;
      let failed = n.failed_count ?? 0;
      let progressed = false;

      for (const key of targetKeys) {
        if (completed.has(key)) continue;
        const tzForCheck = key === NULL_TZ_KEY ? "UTC" : key;
        if (!isLocalTimeReached(tzForCheck, n.tz_send_date, n.tz_send_local, now)) continue;

        const res = await dispatchNotification(
          n as any,
          app,
          key === NULL_TZ_KEY ? { nullTimezone: true } : { timezone: key }
        );
        sent += res.sent;
        failed += res.failed;
        completed.add(key);
        progressed = true;
        dispatched++;
      }

      // Stuck-guard: if the target date is well past, finish it.
      const dayMs = 86_400_000;
      const stale =
        n.tz_send_date &&
        now.getTime() - new Date(n.tz_send_date + "T00:00:00Z").getTime() > 2 * dayMs;

      const allDone = targetKeys.length === 0 || targetKeys.every((k) => completed.has(k));

      if (progressed || allDone || stale) {
        await db
          .from("notifications")
          .update({
            tz_completed: [...completed],
            sent_count: sent,
            failed_count: failed,
            status: allDone || stale ? "completed" : "scheduling",
          })
          .eq("id", n.id);
      }
    } catch {
      // leave as 'scheduling' to retry next run
    }
  }

  return NextResponse.json({ dispatched });
}
