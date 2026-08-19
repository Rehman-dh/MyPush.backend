import Link from "next/link";
import { Radio } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import CreateAppForm from "./CreateAppForm";
import { ThemeToggle } from "@/components/theme-toggle";
import SignOutButton from "@/app/(app)/SignOutButton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface AppRow {
  id: string;
  name: string;
  public_app_key: string;
  fcm_service_account: unknown | null;
  firebase_client_config: { android?: unknown; ios?: unknown } | null;
}

export default async function AppsPage() {
  const db = supabaseAdmin();
  const [{ data: apps }, { data: devices }] = await Promise.all([
    db
      .from("apps")
      .select("id, name, public_app_key, fcm_service_account, firebase_client_config")
      .order("created_at", { ascending: false }),
    db.from("devices").select("app_id, subscribed, platform"),
  ]);

  // Aggregate device counts per app in JS (fine at the target scale).
  const stats = new Map<
    string,
    { total: number; subscribed: number; platforms: Set<string> }
  >();
  for (const d of devices ?? []) {
    const s =
      stats.get(d.app_id) ??
      { total: 0, subscribed: 0, platforms: new Set<string>() };
    s.total += 1;
    if (d.subscribed) s.subscribed += 1;
    if (d.platform) s.platforms.add(d.platform);
    stats.set(d.app_id, s);
  }

  const list = (apps ?? []) as AppRow[];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Radio className="size-4" />
          </div>
          <span className="font-semibold">Push Dashboard</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
            <p className="text-sm text-muted-foreground">
              Select an app to open its dashboard.
            </p>
          </div>
          <CreateAppForm />
        </div>

        {list.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No apps yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead className="text-right">Total devices</TableHead>
                    <TableHead className="text-right">Subscribed</TableHead>
                    <TableHead>Sending (FCM)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((a) => {
                    const s = stats.get(a.id);
                    const devicePlatforms = s ? s.platforms : new Set<string>();
                    const fbc = a.firebase_client_config ?? {};
                    const configured = new Set<string>();
                    if (fbc.android) configured.add("android");
                    if (fbc.ios) configured.add("ios");
                    // Union: show configured platforms (so they appear right after
                    // uploading Firebase config) plus any with registered devices.
                    const platforms = [...new Set([...configured, ...devicePlatforms])];
                    return (
                      <TableRow key={a.id} className="cursor-pointer">
                        <TableCell>
                          <Link
                            href={`/apps/${a.id}/dashboard`}
                            className="block font-medium hover:underline"
                          >
                            {a.name}
                          </Link>
                          <span className="font-mono text-xs text-muted-foreground">
                            {a.public_app_key}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {platforms.length ? (
                              platforms.map((p) => (
                                <Badge
                                  key={p}
                                  variant={devicePlatforms.has(p) ? "secondary" : "outline"}
                                  className="capitalize"
                                >
                                  {p === "ios" ? "iOS" : p}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s?.total ?? 0}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s?.subscribed ?? 0}
                        </TableCell>
                        <TableCell>
                          {a.fcm_service_account ? (
                            <Badge>Configured</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Not set
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
