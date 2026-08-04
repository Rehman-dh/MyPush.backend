"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { createAppAction, CreateAppResult } from "@/app/actions";

const initial: CreateAppResult = { ok: false };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={btn}>
      {pending ? "Creating…" : "Create app"}
    </button>
  );
}

export default function CreateAppForm() {
  const [state, action] = useFormState(createAppAction, initial);
  const router = useRouter();

  // Refresh the app list once a new app is created.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action} style={card}>
      <h3 style={{ marginTop: 0 }}>New app</h3>
      <input name="name" placeholder="App name" style={input} required />
      <label style={{ fontSize: 12, color: "#8b93a3", display: "block", marginBottom: 6 }}>
        FCM service-account JSON (optional now — you can add it later per app)
      </label>
      <input
        type="file"
        name="fcm_service_account"
        accept=".json,application/json"
        style={input}
      />
      <SubmitBtn />

      {state.error && <p style={{ color: "#ff6b6b" }}>{state.error}</p>}
      {state.ok && state.secretKey && (
        <div style={notice}>
          <p style={{ margin: "0 0 8px", color: "#7ee787" }}>
            App created! Save these keys now — the secret won&apos;t be shown again.
          </p>
          <p style={mono}><b>Public App Key:</b> {state.publicKey}</p>
          <p style={mono}><b>Secret REST Key:</b> {state.secretKey}</p>
        </div>
      )}
    </form>
  );
}

const card: React.CSSProperties = {
  background: "#131826",
  border: "1px solid #232a3b",
  borderRadius: 12,
  padding: 20,
  marginBottom: 24,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  background: "#0b0f19",
  border: "1px solid #2a3346",
  borderRadius: 8,
  color: "#e6e8ee",
  boxSizing: "border-box",
};
const btn: React.CSSProperties = {
  padding: "9px 16px",
  background: "#4f7cff",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
const notice: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  background: "#0b0f19",
  border: "1px solid #2a3346",
  borderRadius: 8,
};
const mono: React.CSSProperties = { fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", margin: "4px 0" };
