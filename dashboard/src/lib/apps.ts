import { supabaseAdmin } from "./supabase";
import {
  encryptJson,
  sha256,
  newPublicAppKey,
  newSecretRestKey,
} from "./crypto";

export interface CreatedApp {
  id: string;
  name: string;
  public_app_key: string;
  secret_rest_key: string; // plaintext — returned only on create, never again
}

/**
 * Create a new app. The FCM service-account JSON is stored encrypted.
 * The secret REST key is returned in plaintext only here (DB stores a hash).
 */
export async function createApp(
  name: string,
  fcmServiceAccount?: Record<string, unknown>
): Promise<CreatedApp> {
  const publicKey = newPublicAppKey();
  const secretKey = newSecretRestKey();

  const { data, error } = await supabaseAdmin()
    .from("apps")
    .insert({
      name,
      public_app_key: publicKey,
      secret_rest_key_hash: sha256(secretKey),
      fcm_service_account: fcmServiceAccount ? encryptJson(fcmServiceAccount) : null,
    })
    .select("id, name")
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    public_app_key: publicKey,
    secret_rest_key: secretKey,
  };
}

/** FCM service-account JSON update/rotate. */
export async function setAppFcmCredentials(
  appId: string,
  fcmServiceAccount: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("apps")
    .update({ fcm_service_account: encryptJson(fcmServiceAccount) })
    .eq("id", appId);
  if (error) throw new Error(error.message);
}

/** Rotate the secret REST key — returns the new plaintext value. */
export async function rotateSecretKey(appId: string): Promise<string> {
  const secretKey = newSecretRestKey();
  const { error } = await supabaseAdmin()
    .from("apps")
    .update({ secret_rest_key_hash: sha256(secretKey) })
    .eq("id", appId);
  if (error) throw new Error(error.message);
  return secretKey;
}
