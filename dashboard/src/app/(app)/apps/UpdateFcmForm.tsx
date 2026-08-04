"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateFcmAction } from "@/app/actions";

const initial = { ok: false } as { ok: boolean; error?: string };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={btn}>
      {pending ? "Saving…" : "Save FCM key"}
    </button>
  );
}

export default function UpdateFcmForm({ appId, hasFcm }: { appId: string; hasFcm: boolean }) {
  const [state, action] = useFormState(updateFcmAction, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={linkBtn}>
        {hasFcm ? "Update FCM key (sending)" : "Add FCM key (sending) →"}
      </button>
    );
  }

  return (
    <form action={action} style={{ marginTop: 10, display: "grid", gap: 10 }}>
      <input type="hidden" name="app_id" value={appId} />
      <label style={lbl}>
        Upload FCM <b>service-account JSON</b> (Firebase → Project Settings → Service Accounts →
        Generate new private key). Used by the server to send.
      </label>
      <input
        type="file"
        name="fcm_service_account"
        accept=".json,application/json"
        style={fileInput}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <SubmitBtn />
        <button type="button" onClick={() => setOpen(false)} style={cancelBtn}>
          Close
        </button>
      </div>
      {state.error && <p style={{ color: "#ff6b6b", margin: 0 }}>{state.error}</p>}
      {state.ok && <p style={{ color: "#7ee787", margin: 0 }}>Saved ✓</p>}
    </form>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, color: "#8b93a3" };
const fileInput: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "#0b0f19",
  border: "1px solid #2a3346",
  borderRadius: 8,
  color: "#c7cdd8",
  fontSize: 12,
  boxSizing: "border-box",
};
const btn: React.CSSProperties = {
  padding: "8px 14px",
  background: "#4f7cff",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
const cancelBtn: React.CSSProperties = {
  padding: "8px 14px",
  background: "transparent",
  border: "1px solid #2a3346",
  borderRadius: 8,
  color: "#c7cdd8",
  cursor: "pointer",
};
const linkBtn: React.CSSProperties = {
  marginTop: 8,
  marginRight: 16,
  background: "transparent",
  border: "none",
  color: "#4f7cff",
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
};
