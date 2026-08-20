import { supabaseAdmin } from "@/lib/supabase";
import NotificationsClient, { NotificationRow } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  params,
}: {
  params: { appId: string };
}) {
  const { data: rows } = await supabaseAdmin()
    .from("notifications")
    .select(
      "id, name, title, target_type, status, sent_count, failed_count, clicked_count, scheduled_at, created_at"
    )
    .eq("app_id", params.appId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <NotificationsClient
      notifications={(rows ?? []) as NotificationRow[]}
      appId={params.appId}
    />
  );
}
