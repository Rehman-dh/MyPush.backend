import { supabaseAdmin } from "@/lib/supabase";
import CreateAppForm from "./CreateAppForm";
import FirebaseConfigForm from "./FirebaseConfigForm";
import UpdateFcmForm from "./UpdateFcmForm";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const { data: apps } = await supabaseAdmin()
    .from("apps")
    .select("id, name, public_app_key, fcm_service_account, firebase_client_config, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 style={{ fontSize: 24 }}>Apps</h1>
      <CreateAppForm />

      <div style={{ display: "grid", gap: 12 }}>
        {(apps ?? []).map((a) => {
          const fbc = (a.firebase_client_config as { android?: unknown; ios?: unknown } | null) ?? {};
          return (
            <div key={a.id} style={row}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#8b93a3" }}>
                    {a.public_app_key}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12 }}>
                  <div style={{ color: a.fcm_service_account ? "#7ee787" : "#ffb457" }}>
                    {a.fcm_service_account ? "FCM (send) ✓" : "FCM missing"}
                  </div>
                  <div style={{ color: fbc.android || fbc.ios ? "#7ee787" : "#8b93a3" }}>
                    Firebase client: {fbc.android ? "Android ✓ " : ""}{fbc.ios ? "iOS ✓" : ""}
                    {!fbc.android && !fbc.ios ? "not set" : ""}
                  </div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #1c2333", marginTop: 12, paddingTop: 10 }}>
                <UpdateFcmForm appId={a.id} hasFcm={!!a.fcm_service_account} />
                <FirebaseConfigForm appId={a.id} hasAndroid={!!fbc.android} hasIos={!!fbc.ios} />
              </div>
            </div>
          );
        })}
        {(!apps || apps.length === 0) && (
          <p style={{ color: "#8b93a3" }}>No apps yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}

const row: React.CSSProperties = {
  display: "block",
  padding: "14px 16px",
  background: "#131826",
  border: "1px solid #232a3b",
  borderRadius: 10,
};
