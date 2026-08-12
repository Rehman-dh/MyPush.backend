import { FormSkeleton, PageHeaderSkeleton } from "@/components/skeletons";

export default function ComposeLoading() {
  return (
    <div className="grid gap-4">
      <PageHeaderSkeleton />
      <FormSkeleton fields={7} />
    </div>
  );
}
