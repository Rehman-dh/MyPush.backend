import ComposeForm from "./ComposeForm";

export const dynamic = "force-dynamic";

export default function ComposePage({ params }: { params: { appId: string } }) {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compose</h1>
        <p className="text-sm text-muted-foreground">
          Send a notification now or schedule it for later.
        </p>
      </div>
      <ComposeForm appId={params.appId} />
    </div>
  );
}
