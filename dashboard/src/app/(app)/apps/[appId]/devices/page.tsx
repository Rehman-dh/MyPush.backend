import { supabaseAdmin } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function DevicesPage({
  params,
}: {
  params: { appId: string };
}) {
  const { data: rows } = await supabaseAdmin()
    .from("devices")
    .select("id, external_user_id, platform, tags, subscribed, last_active_at")
    .eq("app_id", params.appId)
    .order("last_active_at", { ascending: false })
    .limit(200);

  const list = rows ?? [];

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
        <p className="text-sm text-muted-foreground">
          Registered devices for this app (most recently active first).
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No devices registered yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>External user ID</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((d) => {
                  const tags = (d.tags as Record<string, string> | null) ?? {};
                  const tagKeys = Object.keys(tags);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.external_user_id ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {d.platform ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tagKeys.length ? (
                            tagKeys.map((k) => (
                              <Badge key={k} variant="secondary">
                                {k}={String(tags[k])}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.subscribed ? "default" : "outline"}>
                          {d.subscribed ? "Subscribed" : "Unsubscribed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.last_active_at
                          ? new Date(d.last_active_at).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
