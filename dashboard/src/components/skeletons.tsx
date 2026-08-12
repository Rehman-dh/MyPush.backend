import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

export function TableSkeleton({
  cols = 5,
  rows = 6,
}: {
  cols?: number;
  rows?: number;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid gap-3 p-4">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-4">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton key={c} className="h-5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid max-w-xl gap-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-24" />
    </div>
  );
}
