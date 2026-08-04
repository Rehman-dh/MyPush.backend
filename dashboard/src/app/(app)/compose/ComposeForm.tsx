"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { sendNotificationAction, SendResult } from "@/app/actions";

const initial: SendResult = { ok: false };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={btn}>
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

export default function ComposeForm({ apps }: { apps: { id: string; name: string }[] }) {
  const [state, action] = useFormState(sendNotificationAction, initial);
  const [target, setTarget] = useState("all");

  return (
    <form action={action} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
      <label style={lbl}>App</label>
      <select name="app_id" style={input} required>
        {apps.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <label style={lbl}>Title</label>
      <input name="title" style={input} required />

      <label style={lbl}>Body</label>
      <textarea name="body" rows={3} style={input} required />

      <label style={lbl}>Image URL (optional)</label>
      <input name="image_url" style={input} placeholder="https://…" />

      <label style={lbl}>Launch URL / deep link (optional)</label>
      <input name="launch_url" style={input} placeholder="myapp://order/A-100" />

      <label style={lbl}>Custom data JSON (optional)</label>
      <textarea
        name="data"
        rows={2}
        style={{ ...input, fontFamily: "monospace", fontSize: 12 }}
        placeholder='{"screen":"order","order_id":"A-100"}'
      />

      <label style={lbl}>Target</label>
      <select
        name="target_type"
        style={input}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      >
        <option value="all">All subscribed</option>
        <option value="tags">Tags (equality + AND)</option>
        <option value="external_ids">External user IDs</option>
      </select>

      {target === "tags" && (
        <>
          <label style={lbl}>Tags filter JSON</label>
          <input
            name="target_filter"
            style={{ ...input, fontFamily: "monospace" }}
            placeholder='{"city":"lahore","plan":"premium"}'
          />
        </>
      )}
      {target === "external_ids" && (
        <>
          <label style={lbl}>External IDs (comma separated)</label>
          <input name="target_filter" style={input} placeholder="4821, 99, 1500" />
        </>
      )}

      <label style={lbl}>Schedule (optional — leave empty to send now)</label>
      <input name="scheduled_at" type="datetime-local" style={input} />

      <SubmitBtn />

      {state.error && <p style={{ color: "#ff6b6b" }}>{state.error}</p>}
      {state.ok && state.status === "scheduled" && (
        <p style={{ color: "#7ee787" }}>Scheduled ✓ — cron will send it at the set time.</p>
      )}
      {state.ok && state.status === "completed" && (
        <p style={{ color: "#7ee787" }}>
          Sent ✓ — {state.sent} delivered, {state.failed} failed.
        </p>
      )}
    </form>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, color: "#8b93a3", marginBottom: -6 };
const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#0b0f19",
  border: "1px solid #2a3346",
  borderRadius: 8,
  color: "#e6e8ee",
  boxSizing: "border-box",
};
const btn: React.CSSProperties = {
  padding: "11px 18px",
  background: "#4f7cff",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
  justifySelf: "start",
};
