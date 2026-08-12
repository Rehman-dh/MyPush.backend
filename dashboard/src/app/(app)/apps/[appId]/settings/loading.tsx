import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/skeletons";

export default function SettingsLoading() {
  return (
    <div className="grid max-w-3xl gap-4">
      <PageHeaderSkeleton />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="grid gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
