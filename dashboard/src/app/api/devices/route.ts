import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { appFromPublicKey } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/devices  — register/upsert a device.
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

  if (!b.device_id || !b.push_token || !b.platform) {
    return NextResponse.json(
      { error: "device_id, push_token, platform required" },
      { status: 400 }
    );
  }
  if (b.platform !== "android" && b.platform !== "ios") {
    return NextResponse.json({ error: "platform must be android|ios" }, { status: 400 });
  }

  const row = {
    id: b.device_id,
    app_id: app.id,
    push_token: b.push_token,
    platform: b.platform,
    language: b.language ?? null,
    timezone: b.timezone ?? null,
    os_version: b.os_version ?? null,
    app_version: b.app_version ?? null,
    device_model: b.device_model ?? null,
    subscribed: true,
    last_active_at: new Date().toISOString(),
  };

  // Upsert on id; do not overwrite tags/external_user_id (registration doesn't touch them).
  const { error } = await supabaseAdmin()
    .from("devices")
    .upsert(row, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: b.device_id, subscribed: true });
}
