import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";

export default function DevicesLoading() {
  return (
    <div className="grid gap-4">
      <PageHeaderSkeleton />
      <TableSkeleton cols={5} rows={6} />
    </div>
  );
}
