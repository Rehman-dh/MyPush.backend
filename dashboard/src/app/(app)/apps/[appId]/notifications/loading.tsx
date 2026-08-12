import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";

export default function NotificationsLoading() {
  return (
    <div className="grid gap-4">
      <PageHeaderSkeleton />
      <TableSkeleton cols={8} rows={6} />
    </div>
  );
}
