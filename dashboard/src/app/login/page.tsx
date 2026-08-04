"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/apps");
    router.refresh();
  }

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: 340,
          padding: 28,
          background: "#131826",
          borderRadius: 12,
          border: "1px solid #232a3b",
        }}
      >
        <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Push Dashboard</h1>
        <p style={{ color: "#8b93a3", margin: "0 0 20px", fontSize: 13 }}>Sign in to continue</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />
        {error && <p style={{ color: "#ff6b6b", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 14 }}>
          Create a user in Supabase → Authentication → Users.
        </p>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  background: "#0b0f19",
  border: "1px solid #2a3346",
  borderRadius: 8,
  color: "#e6e8ee",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#4f7cff",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
