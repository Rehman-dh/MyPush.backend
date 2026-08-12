import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import UpdateFcmForm from "./UpdateFcmForm";
import FirebaseConfigForm from "./FirebaseConfigForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: { appId: string };
}) {
  const { data: app } = await supabaseAdmin()
    .from("apps")
    .select("id, name, public_app_key, fcm_service_account, firebase_client_config")
    .eq("id", params.appId)
    .maybeSingle();

  if (!app) notFound();

  const fbc =
    (app.firebase_client_config as { android?: unknown; ios?: unknown } | null) ??
    {};
  const hasFcm = !!app.fcm_service_account;

  return (
    <div className="grid max-w-3xl gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Keys and Firebase configuration for {app.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public App Key</CardTitle>
          <CardDescription>
            Safe to embed in the client SDK. Used for device registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="break-all rounded bg-muted px-2 py-1 text-sm">
            {app.public_app_key}
          </code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">FCM sending credentials</CardTitle>
              <CardDescription>
                Service-account JSON used by the server to send.
              </CardDescription>
            </div>
            <Badge variant={hasFcm ? "default" : "outline"}>
              {hasFcm ? "Configured" : "Not set"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <UpdateFcmForm appId={app.id} hasFcm={hasFcm} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Firebase client config</CardTitle>
              <CardDescription>
                Powers zero-config SDK init (no google-services files in the app).
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Badge variant={fbc.android ? "secondary" : "outline"}>Android</Badge>
              <Badge variant={fbc.ios ? "secondary" : "outline"}>iOS</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FirebaseConfigForm
            appId={app.id}
            hasAndroid={!!fbc.android}
            hasIos={!!fbc.ios}
          />
        </CardContent>
      </Card>
    </div>
  );
}
