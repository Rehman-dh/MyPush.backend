import { NextRequest, NextResponse } from "next/server";
import { appFromPublicKey } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/config  — return the Firebase client config for the SDK to
 * initialize Firebase at runtime (zero manual setup in the app).
 * Header: X-App-Key: pub_...
 *
 * Response: { android?: FirebaseOptions, ios?: FirebaseOptions }
 * (client config, not secret).
 */
export async function GET(req: NextRequest) {
  const app = await appFromPublicKey(req.headers.get("x-app-key"));
  if (!app) return NextResponse.json({ error: "invalid app key" }, { status: 401 });

  const config = (app.firebase_client_config as Record<string, unknown> | null) ?? {};
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
