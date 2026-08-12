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

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
const statusVariant: Record<string, BadgeVariant> = {
  completed: "default",
  sending: "secondary",
  scheduled: "outline",
  failed: "destructive",
};

export default async function NotificationsPage({
  params,
}: {
  params: { appId: string };
}) {
  const { data: rows } = await supabaseAdmin()
    .from("notifications")
    .select(
      "id, title, target_type, status, sent_count, failed_count, clicked_count, scheduled_at, created_at"
    )
    .eq("app_id", params.appId)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = rows ?? [];

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          The 100 most recent notifications for this app.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No notifications sent yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((n) => {
                  const ctr =
                    n.sent_count > 0
                      ? ((n.clicked_count / n.sent_count) * 100).toFixed(1) + "%"
                      : "—";
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.title}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {n.target_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[n.status] ?? "secondary"}>
                          {n.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n.sent_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n.failed_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n.clicked_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{ctr}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(n.scheduled_at ?? n.created_at).toLocaleString()}
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
