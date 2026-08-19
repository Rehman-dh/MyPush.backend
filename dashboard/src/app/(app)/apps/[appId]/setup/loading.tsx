import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/skeletons";

export default function SetupLoading() {
  return (
    <div className="grid max-w-3xl gap-4">
      <PageHeaderSkeleton />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-9 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
