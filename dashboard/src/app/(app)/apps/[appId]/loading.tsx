import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the app-scoped layout (sidebar + header) is resolving, e.g. when
 * entering an app from the All Apps list. Mirrors the shell so the transition
 * reads as a shimmer of the real layout, not the All Apps table.
 */
export default function AppShellLoading() {
  return (
    <div className="flex min-h-screen w-full">
      {/* sidebar placeholder */}
      <div className="hidden w-64 shrink-0 flex-col gap-4 border-r p-3 md:flex">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <div className="grid gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="mt-2 grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>

      {/* inset */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-8 w-40" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
