import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { appFromPublicKey } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/events  — report a click.
 * Body: { "notification_id": "uuid", "device_id": "uuid", "type": "clicked" }
 * Header: X-App-Key: pub_...
 */
export async function POST(req: NextRequest) {
  const app = await appFromPublicKey(req.headers.get("x-app-key"));
  if (!app) return NextResponse.json({ error: "invalid app key" }, { status: 401 });

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!b.notification_id || b.type !== "clicked") {
    return NextResponse.json(
      { error: "notification_id and type=clicked required" },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Verify the notification belongs to this app.
  const { data: notif } = await db
    .from("notifications")
    .select("id")
    .eq("id", b.notification_id)
    .eq("app_id", app.id)
    .maybeSingle();

  if (!notif) return NextResponse.json({ error: "notification not found" }, { status: 404 });

  await db.from("events").insert({
    notification_id: b.notification_id,
    device_id: b.device_id ?? null,
    type: "clicked",
  });

  // Atomic increment (race-safe)
  await db.rpc("increment_notification_clicks", { nid: b.notification_id });

  return NextResponse.json({ ok: true });
}
