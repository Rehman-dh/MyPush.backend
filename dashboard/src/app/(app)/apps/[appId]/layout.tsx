import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import SignOutButton from "@/app/(app)/SignOutButton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function AppScopedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { appId: string };
}) {
  const { data: apps } = await supabaseAdmin()
    .from("apps")
    .select("id, name")
    .order("created_at", { ascending: false });

  const list = apps ?? [];
  const activeApp = list.find((a) => a.id === params.appId);
  if (!activeApp) notFound();

  return (
    <SidebarProvider>
      <AppSidebar apps={list} activeAppId={params.appId} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">
              {activeApp.name}
            </span>
            <span className="text-xs text-muted-foreground">Push Dashboard</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
