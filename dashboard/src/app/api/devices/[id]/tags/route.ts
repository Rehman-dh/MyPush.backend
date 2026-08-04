import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { appFromPublicKey } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * PATCH /api/devices/{id}/tags  — merge/delete tags.
 * Body: { "set": {"city":"lahore"}, "delete": ["plan"] }
 * Header: X-App-Key: pub_...
 */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const app = await appFromPublicKey(req.headers.get("x-app-key"));
  if (!app) return NextResponse.json({ error: "invalid app key" }, { status: 401 });

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: dev, error: readErr } = await db
    .from("devices")
    .select("tags")
    .eq("id", ctx.params.id)
    .eq("app_id", app.id)
    .maybeSingle();

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!dev) return NextResponse.json({ error: "device not found" }, { status: 404 });

  const tags: Record<string, string> = { ...(dev.tags as Record<string, string>) };
  if (b.set && typeof b.set === "object") {
    for (const [k, v] of Object.entries(b.set)) tags[k] = String(v);
  }
  if (Array.isArray(b.delete)) {
    for (const k of b.delete) delete tags[k];
  }

  const { error } = await db
    .from("devices")
    .update({ tags, last_active_at: new Date().toISOString() })
    .eq("id", ctx.params.id)
    .eq("app_id", app.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tags });
}
