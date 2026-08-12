import Link from "next/link";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Radio className="size-6" />
        </div>
        <div className="grid gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">404</h1>
          <p className="text-muted-foreground">
            This page could not be found.
          </p>
        </div>
        <Button asChild>
          <Link href="/apps">Back to apps</Link>
        </Button>
      </div>
    </main>
  );
}
