import admin from "firebase-admin";
import { decryptJson, EncryptedBlob } from "./crypto";

/**
 * Per-app firebase-admin instances (named apps), cached across invocations.
 * FCM service-account JSON is stored encrypted in `apps.fcm_service_account`.
 */
const cache = new Map<string, admin.app.App>();

export function getMessagingForApp(
  appId: string,
  encryptedServiceAccount: EncryptedBlob
): admin.messaging.Messaging {
  let app = cache.get(appId);
  if (!app) {
    const serviceAccount = decryptJson<admin.ServiceAccount>(encryptedServiceAccount);
    // Named app so multiple apps coexist in one process.
    app =
      admin.apps.find((a) => a?.name === appId) ??
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, appId);
    cache.set(appId, app);
  }
  return app.messaging();
}

/** FCM error codes that indicate a "dead token" (should unsubscribe). */
export function isUnregisteredError(code?: string): boolean {
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token" ||
    code === "messaging/invalid-argument"
  );
}
