export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;

  return (
    <main className="p-6">
      <h1 className="text-xl font-medium tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Workspace <span className="font-mono">{workspace}</span>
      </p>
    </main>
  );
}
