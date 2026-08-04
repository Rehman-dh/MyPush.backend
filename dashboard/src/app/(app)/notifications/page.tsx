import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  completed: "#7ee787",
  sending: "#4f7cff",
  scheduled: "#ffb457",
  failed: "#ff6b6b",
};

export default async function NotificationsPage() {
  const { data: rows } = await supabaseAdmin()
    .from("notifications")
    .select("id, title, target_type, status, sent_count, failed_count, clicked_count, scheduled_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 style={{ fontSize: 24 }}>Notifications</h1>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#8b93a3" }}>
              <th style={th}>Title</th>
              <th style={th}>Target</th>
              <th style={th}>Status</th>
              <th style={th}>Sent</th>
              <th style={th}>Failed</th>
              <th style={th}>Clicks</th>
              <th style={th}>CTR</th>
              <th style={th}>When</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((n) => {
              const ctr =
                n.sent_count > 0
                  ? ((n.clicked_count / n.sent_count) * 100).toFixed(1) + "%"
                  : "—";
              return (
                <tr key={n.id} style={{ borderTop: "1px solid #1c2333" }}>
                  <td style={td}>{n.title}</td>
                  <td style={td}>{n.target_type}</td>
                  <td style={{ ...td, color: statusColor[n.status] ?? "#c7cdd8" }}>{n.status}</td>
                  <td style={td}>{n.sent_count}</td>
                  <td style={td}>{n.failed_count}</td>
                  <td style={td}>{n.clicked_count}</td>
                  <td style={td}>{ctr}</td>
                  <td style={{ ...td, color: "#8b93a3", fontSize: 12 }}>
                    {new Date(n.scheduled_at ?? n.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!rows || rows.length === 0) && (
          <p style={{ color: "#8b93a3" }}>No notifications sent yet.</p>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "10px" };
