import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import SetupInstructions from "./SetupInstructions";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  params,
}: {
  params: { appId: string };
}) {
  const { data: app } = await supabaseAdmin()
    .from("apps")
    .select("id, name, public_app_key, firebase_client_config")
    .eq("id", params.appId)
    .maybeSingle();

  if (!app) notFound();

  const fbc =
    (app.firebase_client_config as { android?: unknown; ios?: unknown } | null) ??
    {};

  return (
    <div className="grid max-w-3xl gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setup</h1>
        <p className="text-sm text-muted-foreground">
          Add the SDK to your app and start receiving notifications with{" "}
          {app.name}&apos;s App Key.
        </p>
      </div>

      <SetupInstructions
        appId={app.id}
        appKey={app.public_app_key}
        hasAndroidConfig={!!fbc.android}
        hasIosConfig={!!fbc.ios}
      />
    </div>
  );
}
