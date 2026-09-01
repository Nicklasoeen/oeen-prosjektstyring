import { PageFrame, PageHeader } from "@/components/page-frame";

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;

  return (
    <PageFrame>
      <PageHeader
        title="Dashboard"
        description="Oversikt kommer her. Gå til Prosjekter for å starte arbeidet."
      />
      <p className="font-mono text-label text-muted-foreground">{workspace}</p>
    </PageFrame>
  );
}
