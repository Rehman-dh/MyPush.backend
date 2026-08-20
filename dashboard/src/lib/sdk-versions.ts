/**
 * Code fallback for the SDK versions shown on the dashboard **Setup** page.
 *
 * The live values come from the `sdk_versions` table (editable from the Setup
 * page with no deploy — see `getSdkVersions()` in `sdk-versions-store.ts`).
 * These constants are only used if that row is missing/unreadable, so keep them
 * roughly current as a safety net.
 *
 * Version-safety: values must match a **published, immutable tag** (Flutter git
 * tag / Android JitPack tag). Never move or rewrite an old tag — apps pinned to
 * an older version must keep resolving to their exact code.
 *
 * This module is pure (no server imports) so it stays safe to import anywhere.
 */
export type SdkVersions = {
  /** Flutter git tag on github.com/Rehman-dh/MyPush.Package (used as `ref:`). */
  flutter: string;
  /** Android JitPack tag on github.com/Rehman-dh/my_push_android. */
  android: string;
};

export const SDK_VERSIONS: SdkVersions = {
  flutter: "0.3.2",
  android: "0.2.0",
};
