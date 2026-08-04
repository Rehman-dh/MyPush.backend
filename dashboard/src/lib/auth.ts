import { supabaseAdmin } from "./supabase";
import { sha256 } from "./crypto";

export interface AppRow {
  id: string;
  name: string;
  public_app_key: string;
  secret_rest_key_hash: string;
  fcm_service_account: unknown | null;
  firebase_client_config: unknown | null;
  created_at: string;
}

/** Resolve app by public App Key (X-App-Key header). Client-safe scope. */
export async function appFromPublicKey(key: string | null): Promise<AppRow | null> {
  if (!key) return null;
  const { data } = await supabaseAdmin()
    .from("apps")
    .select("*")
    .eq("public_app_key", key)
    .maybeSingle();
  return (data as AppRow) ?? null;
}

/** Resolve app by secret REST key (Authorization: Bearer <sk_...>). Admin scope. */
export async function appFromSecretKey(authHeader: string | null): Promise<AppRow | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data } = await supabaseAdmin()
    .from("apps")
    .select("*")
    .eq("secret_rest_key_hash", sha256(token))
    .maybeSingle();
  return (data as AppRow) ?? null;
}
