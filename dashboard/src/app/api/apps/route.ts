import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createApp } from "@/lib/apps";

export const runtime = "nodejs";

/**
 * Bootstrap app-creation endpoint.
 * Guarded by ADMIN_SETUP_TOKEN (the dashboard UI will later wrap this with a Supabase Auth session).
 *
 * POST /api/apps
 * Header: X-Admin-Token: <ADMIN_SETUP_TOKEN>
 * Body: { "name": "My App", "fcm_service_account": { ...serviceAccountJson } }
 */
export async function POST(req: NextRequest) {
  const adminToken = process.env.ADMIN_SETUP_TOKEN;
  if (!adminToken || req.headers.get("x-admin-token") !== adminToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!b.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    const app = await createApp(b.name, b.fcm_service_account);
    return NextResponse.json(app);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** GET /api/apps — list (no secrets). Admin-token guarded. */
export async function GET(req: NextRequest) {
  const adminToken = process.env.ADMIN_SETUP_TOKEN;
  if (!adminToken || req.headers.get("x-admin-token") !== adminToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin()
    .from("apps")
    .select("id, name, public_app_key, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ apps: data });
}
