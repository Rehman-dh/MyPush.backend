"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      style={{
        background: "transparent",
        border: "1px solid #2a3346",
        color: "#c7cdd8",
        padding: "6px 12px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      Sign out
    </button>
  );
}
