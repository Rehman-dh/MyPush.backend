import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { appFromSecretKey } from "@/lib/auth";
import { dispatchAndFinalize } from "@/lib/delivery";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel: allow up to 60s for send-now batches

/**
 * POST /api/notifications  — create + send now OR schedule.
 * Header: Authorization: Bearer <sk_...>
 */
export async function POST(req: NextRequest) {
  const app = await appFromSecretKey(req.headers.get("authorization"));
  if (!app) return NextResponse.json({ error: "invalid rest key" }, { status: 401 });

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!b.title || !b.body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }
  const targetType = b.target_type ?? "all";
  if (!["all", "tags", "external_ids"].includes(targetType)) {
    return NextResponse.json({ error: "invalid target_type" }, { status: 400 });
  }

  // future scheduled_at?
  const scheduledAt = b.scheduled_at ? new Date(b.scheduled_at) : null;
  const isScheduled = scheduledAt !== null && scheduledAt.getTime() > Date.now();

  const platforms =
    Array.isArray(b.platforms) && b.platforms.length ? b.platforms : ["android", "ios"];

  const insert = {
    app_id: app.id,
    name: b.name ? String(b.name) : null,
    title: String(b.title),
    subtitle: b.subtitle ? String(b.subtitle) : null,
    body: String(b.body),
    image_url: b.image_url ?? null,
    launch_url: b.launch_url ?? null,
    data: b.data ?? {},
    platforms,
    options: b.options && typeof b.options === "object" ? b.options : {},
    target_type: targetType,
    target_filter: b.target_filter ?? (targetType === "external_ids" ? [] : {}),
    status: isScheduled ? "scheduled" : "sending",
    delivery_mode: isScheduled ? "fixed" : "now",
    scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
  };

  const db = supabaseAdmin();
  const { data: notif, error } = await db
    .from("notifications")
    .insert(insert)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isScheduled) {
    return NextResponse.json({ id: notif.id, status: "scheduled", scheduled_at: notif.scheduled_at });
  }

  // Send now
  try {
    const result = await dispatchAndFinalize(notif as any, app);
    return NextResponse.json({ id: notif.id, status: "completed", ...result });
  } catch (e: any) {
    return NextResponse.json({ id: notif.id, status: "failed", error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/notifications?app_id=...  — list (dashboard; secret key OR session).
 * v1: secret REST key se list.
 */
export async function GET(req: NextRequest) {
  const app = await appFromSecretKey(req.headers.get("authorization"));
  if (!app) return NextResponse.json({ error: "invalid rest key" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("notifications")
    .select("*")
    .eq("app_id", app.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data });
}
