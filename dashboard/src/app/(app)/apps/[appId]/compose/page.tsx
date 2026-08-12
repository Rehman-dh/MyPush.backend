import ComposeForm from "./ComposeForm";

export const dynamic = "force-dynamic";

export default function ComposePage({ params }: { params: { appId: string } }) {
  return <ComposeForm appId={params.appId} />;
}
