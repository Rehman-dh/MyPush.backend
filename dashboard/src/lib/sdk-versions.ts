/**
 * Single source of truth for the SDK versions the dashboard **Setup** page shows.
 *
 * The Setup page always presents the LATEST version. When you release a new
 * version of an SDK (after changing the classes/methods shown in the setup
 * steps), bump the value here — that is the only place the Setup page reads.
 *
 * Version-safety: these values must match a **published, immutable tag**
 * (Flutter git tag / Android JitPack tag). Never move or rewrite an old tag —
 * apps pinned to an older version must keep resolving to their exact code.
 */
export const SDK_VERSIONS = {
  /** Flutter git tag on github.com/Rehman-dh/MyPush.Package (used as `ref:`). */
  flutter: "0.3.1",
  /** Android JitPack tag on github.com/Rehman-dh/my_push_android. */
  android: "0.2.0",
} as const;
