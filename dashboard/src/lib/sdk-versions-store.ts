import "server-only";
import { supabaseAdmin } from "./supabase";
import { SDK_VERSIONS, type SdkVersions } from "./sdk-versions";

/**
 * Read the live SDK versions from the `sdk_versions` singleton row, falling back
 * to the code constants if the row is missing/unreadable. Server-only.
 */
export async function getSdkVersions(): Promise<SdkVersions> {
  try {
    const { data } = await supabaseAdmin()
      .from("sdk_versions")
      .select("flutter, android")
      .eq("id", true)
      .maybeSingle();
    return {
      flutter: data?.flutter?.trim() || SDK_VERSIONS.flutter,
      android: data?.android?.trim() || SDK_VERSIONS.android,
    };
  } catch {
    return { ...SDK_VERSIONS };
  }
}
