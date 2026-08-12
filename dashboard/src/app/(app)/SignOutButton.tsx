"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

export default function SignOutButton({
  variant = "outline",
  className,
  withLabel = true,
}: {
  variant?: "outline" | "ghost";
  className?: string;
  withLabel?: boolean;
}) {
  const router = useRouter();
  return (
    <Button
      variant={variant}
      size={withLabel ? "sm" : "icon"}
      className={className}
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
      {withLabel ? "Sign out" : <span className="sr-only">Sign out</span>}
    </Button>
  );
}
