import { supabaseAdmin } from "@/lib/supabase";
import ComposeForm from "./ComposeForm";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const { data: apps } = await supabaseAdmin()
    .from("apps")
    .select("id, name")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 style={{ fontSize: 24 }}>Compose</h1>
      {!apps || apps.length === 0 ? (
        <p style={{ color: "#8b93a3" }}>Create an app first from the Apps page.</p>
      ) : (
        <ComposeForm apps={apps} />
      )}
    </div>
  );
}
