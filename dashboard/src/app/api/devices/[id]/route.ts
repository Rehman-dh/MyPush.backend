import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { appFromPublicKey } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * PATCH /api/devices/{id}  — set/clear external_user_id (login/logout).
 * Body: { "external_user_id": "4821" }  or  { "external_user_id": null }
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

  if (!("external_user_id" in b)) {
    return NextResponse.json({ error: "external_user_id required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("devices")
    .update({
      external_user_id: b.external_user_id ?? null,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", ctx.params.id)
    .eq("app_id", app.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
