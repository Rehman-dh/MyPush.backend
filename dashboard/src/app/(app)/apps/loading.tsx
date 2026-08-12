import { Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons";

export default function AppsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Radio className="size-4" />
          </div>
          <span className="font-semibold">Push Dashboard</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="grid gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <TableSkeleton cols={5} rows={4} />
      </main>
    </div>
  );
}
