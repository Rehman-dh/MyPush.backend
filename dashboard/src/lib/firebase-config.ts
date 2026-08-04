/**
 * Parse Firebase client config from the files developers already have
 * (google-services.json for Android, GoogleService-Info.plist for iOS),
 * so the SDK can initialize Firebase at runtime — no manual setup in the app.
 *
 * These values are client config (not secret): apiKey, appId, senderId, projectId.
 */

export interface FirebaseClientOptions {
  apiKey: string;
  appId: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket?: string;
  iosBundleId?: string;
}

export interface FirebaseClientConfig {
  android?: FirebaseClientOptions;
  ios?: FirebaseClientOptions;
}

/** Extract Android FirebaseOptions from google-services.json text. */
export function parseGoogleServicesJson(text: string): FirebaseClientOptions {
  const j = JSON.parse(text);
  const project = j.project_info ?? {};
  const client = Array.isArray(j.client) ? j.client[0] : undefined;
  if (!client) throw new Error("google-services.json has no client entry");

  const appId = client.client_info?.mobilesdk_app_id;
  const apiKey = client.api_key?.[0]?.current_key;
  const messagingSenderId = project.project_number;
  const projectId = project.project_id;

  if (!appId || !apiKey || !messagingSenderId || !projectId) {
    throw new Error("google-services.json is missing required fields");
  }
  return {
    apiKey,
    appId,
    messagingSenderId,
    projectId,
    storageBucket: project.storage_bucket,
  };
}

/** Extract iOS FirebaseOptions from GoogleService-Info.plist (XML) text. */
export function parseGoogleServiceInfoPlist(text: string): FirebaseClientOptions {
  const get = (key: string): string | undefined => {
    const re = new RegExp(
      `<key>${key}</key>\\s*<string>([^<]*)</string>`,
      "i"
    );
    const m = text.match(re);
    return m?.[1]?.trim();
  };

  const apiKey = get("API_KEY");
  const appId = get("GOOGLE_APP_ID");
  const messagingSenderId = get("GCM_SENDER_ID");
  const projectId = get("PROJECT_ID");

  if (!apiKey || !appId || !messagingSenderId || !projectId) {
    throw new Error("GoogleService-Info.plist is missing required fields");
  }
  return {
    apiKey,
    appId,
    messagingSenderId,
    projectId,
    storageBucket: get("STORAGE_BUCKET"),
    iosBundleId: get("BUNDLE_ID"),
  };
}
