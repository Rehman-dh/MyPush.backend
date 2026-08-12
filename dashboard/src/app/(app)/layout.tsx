import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";

/**
 * Auth gate for all dashboard routes. The visual shell (sidebar / header) is
 * provided by the nested layouts: the app-scoped shell lives in
 * apps/[appId]/layout.tsx, and the All Apps landing renders its own header.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
