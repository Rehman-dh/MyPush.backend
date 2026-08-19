import { supabaseAdmin } from "@/lib/supabase";
import ComposeForm from "./ComposeForm";

export const dynamic = "force-dynamic";

export default async function ComposePage({ params }: { params: { appId: string } }) {
  const { count } = await supabaseAdmin()
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("app_id", params.appId)
    .eq("subscribed", true);

  return <ComposeForm appId={params.appId} subscribedCount={count ?? 0} />;
}
