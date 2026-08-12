import { Bell, MousePointerClick, Send, Users } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { dayKey, dayLabel, lastNDayKeys } from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardCharts } from "./DashboardCharts";

export const dynamic = "force-dynamic";

const RANGE_DAYS = 30;

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: { appId: string };
}) {
  const db = supabaseAdmin();
  const [{ data: notifications }, { data: devices }] = await Promise.all([
    db
      .from("notifications")
      .select("sent_count, failed_count, clicked_count, created_at, scheduled_at")
      .eq("app_id", params.appId),
    db.from("devices").select("subscribed").eq("app_id", params.appId),
  ]);

  const notifs = notifications ?? [];
  const devs = devices ?? [];

  // Stat totals
  const totalSent = notifs.reduce((a, n) => a + (n.sent_count ?? 0), 0);
  const totalClicked = notifs.reduce((a, n) => a + (n.clicked_count ?? 0), 0);
  const totalDevices = devs.length;
  const totalSubscribed = devs.filter((d) => d.subscribed).length;
  const avgCtr = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

  // Daily series over the last RANGE_DAYS days, keyed by created_at (see plan:
  // no per-event timestamps exist, so we bucket by the notification's own day).
  const keys = lastNDayKeys(RANGE_DAYS);
  const sentByDay = new Map<string, number>();
  const clickByDay = new Map<string, number>();
  for (const n of notifs) {
    const when = n.created_at ?? n.scheduled_at;
    if (!when) continue;
    const k = dayKey(new Date(when));
    sentByDay.set(k, (sentByDay.get(k) ?? 0) + (n.sent_count ?? 0));
    clickByDay.set(k, (clickByDay.get(k) ?? 0) + (n.clicked_count ?? 0));
  }

  const sentSeries = keys.map((k) => ({
    label: dayLabel(k),
    sent: sentByDay.get(k) ?? 0,
  }));
  const ctrSeries = keys.map((k) => {
    const s = sentByDay.get(k) ?? 0;
    const c = clickByDay.get(k) ?? 0;
    return { label: dayLabel(k), ctr: s > 0 ? +((c / s) * 100).toFixed(1) : 0 };
  });
  const subscriptionSplit = [
    { name: "Subscribed", value: totalSubscribed },
    { name: "Unsubscribed", value: Math.max(0, totalDevices - totalSubscribed) },
  ];

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview for the last {RANGE_DAYS} days.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total subscribed"
          value={totalSubscribed.toLocaleString()}
          hint={`${totalDevices.toLocaleString()} total devices`}
          icon={Users}
        />
        <StatCard
          title="Total sent"
          value={totalSent.toLocaleString()}
          hint="Across all notifications"
          icon={Send}
        />
        <StatCard
          title="Total clicks"
          value={totalClicked.toLocaleString()}
          hint="Reported by the SDK"
          icon={MousePointerClick}
        />
        <StatCard
          title="Avg CTR"
          value={`${avgCtr.toFixed(1)}%`}
          hint="Clicks ÷ sent"
          icon={Bell}
        />
      </div>

      <DashboardCharts
        sentSeries={sentSeries}
        ctrSeries={ctrSeries}
        subscriptionSplit={subscriptionSplit}
      />

      {notifs.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No data yet</CardTitle>
            <CardDescription>
              Send your first notification from the Compose page to see analytics
              here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
