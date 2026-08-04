import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase-server";
import SignOutButton from "./SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "14px 24px",
          borderBottom: "1px solid #1c2333",
          background: "#0e1320",
        }}
      >
        <strong style={{ fontSize: 15 }}>📣 Push</strong>
        <nav style={{ display: "flex", gap: 16, flex: 1 }}>
          <Link href="/apps" style={navLink}>Apps</Link>
          <Link href="/compose" style={navLink}>Compose</Link>
          <Link href="/notifications" style={navLink}>Notifications</Link>
        </nav>
        <span style={{ color: "#6b7280", fontSize: 12 }}>{user.email}</span>
        <SignOutButton />
      </header>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>{children}</main>
    </div>
  );
}

const navLink: React.CSSProperties = {
  color: "#c7cdd8",
  textDecoration: "none",
  fontSize: 14,
};
