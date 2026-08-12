"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface NotificationRow {
  id: string;
  name: string | null;
  title: string;
  target_type: string;
  status: string;
  sent_count: number;
  failed_count: number;
  clicked_count: number;
  scheduled_at: string | null;
  created_at: string;
}

type TabKey = "all" | "sent" | "scheduled" | "drafts";
type SortKey = "sent_at" | "created_at";
type SortDir = "asc" | "desc";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "scheduled", label: "Scheduled" },
  { key: "drafts", label: "Drafts" },
];

const statusDot: Record<string, string> = {
  completed: "bg-green-500",
  sending: "bg-blue-500",
  scheduling: "bg-blue-500",
  scheduled: "bg-amber-500",
  failed: "bg-red-500",
};

const statusLabel: Record<string, string> = {
  completed: "Delivered",
  sending: "Sending",
  scheduling: "Sending (by timezone)",
  scheduled: "Scheduled",
  failed: "Failed",
};

function isDispatched(status: string) {
  return status !== "scheduled" && status !== "scheduling";
}
function isScheduled(status: string) {
  return status === "scheduled" || status === "scheduling";
}

function sentAtOf(n: NotificationRow): string | null {
  // We have no dedicated "sent" timestamp; for dispatched sends created_at is
  // effectively the send time, and scheduled ones surface their scheduled time.
  if (n.status === "scheduled") return n.scheduled_at;
  return n.created_at;
}

function fmt(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function NotificationsClient({
  notifications,
  appId,
}: {
  notifications: NotificationRow[];
  appId: string;
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sent_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const counts = useMemo(
    () => ({
      all: notifications.length,
      sent: notifications.filter((n) => isDispatched(n.status)).length,
      scheduled: notifications.filter((n) => isScheduled(n.status)).length,
      drafts: 0,
    }),
    [notifications]
  );

  const rows = useMemo(() => {
    let list = notifications;
    if (tab === "sent") list = list.filter((n) => isDispatched(n.status));
    else if (tab === "scheduled") list = list.filter((n) => isScheduled(n.status));
    else if (tab === "drafts") list = [];

    const q = query.trim().toLowerCase();
    if (q) list = list.filter((n) => n.title.toLowerCase().includes(q));

    const sorted = [...list].sort((a, b) => {
      const av = (sortKey === "sent_at" ? sentAtOf(a) : a.created_at) ?? "";
      const bv = (sortKey === "sent_at" ? sentAtOf(b) : b.created_at) ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [notifications, tab, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? null : sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
    );

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <Button asChild>
          <Link href={`/apps/${appId}/compose`}>
            <Plus className="h-4 w-4" />
            New Push
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs",
                  active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("sent_at")}
                >
                  Sent at
                  <SortIcon col="sent_at" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("created_at")}
                >
                  Created at
                  <SortIcon col="created_at" />
                </TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {tab === "drafts"
                      ? "No drafts."
                      : query
                        ? "No notifications match your search."
                        : "No notifications yet."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((n) => {
                  const ctr =
                    n.sent_count > 0
                      ? ((n.clicked_count / n.sent_count) * 100).toFixed(2) + "%"
                      : "—";
                  return (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="font-medium">{n.name || n.title}</div>
                        {n.name && (
                          <div className="text-xs text-muted-foreground">{n.title}</div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {n.target_type.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              statusDot[n.status] ?? "bg-muted-foreground"
                            )}
                          />
                          {statusLabel[n.status] ?? n.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmt(sentAtOf(n))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmt(n.created_at)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {n.sent_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{ctr}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigator.clipboard?.writeText(n.id)}
                            >
                              <Copy className="h-4 w-4" />
                              Copy ID
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
