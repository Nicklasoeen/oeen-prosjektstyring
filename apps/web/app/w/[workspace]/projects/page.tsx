import Link from "next/link";

import { createProject } from "@/app/w/[workspace]/projects/actions";
import { EmptyState } from "@/components/empty-state";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ProjectStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { formatDateNb } from "@/lib/format";

type ProjectRow = {
  id: string;
  name: string;
  status: "active" | "archived";
  created_at: string;
};

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects`
  );

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  if (error) {
    throw error;
  }

  const projects = data ?? [];

  return (
    <PageFrame>
      <PageHeader
        title="Prosjekter"
        description={`Arbeid som hører til ${workspace.name}.`}
      />

      <form
        id="nytt"
        action={createProject}
        className="scroll-mt-6 flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/8 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="workspace_slug" value={slug} />
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="name">Nytt prosjekt</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="F.eks. Nettside"
            className="h-9"
          />
        </div>
        <Button type="submit" className="h-9">
          Opprett
        </Button>
      </form>

      {projects.length === 0 ? (
        <EmptyState
          title="Ingen prosjekter ennå"
          description="Gi det første prosjektet et navn over — det blir synlig bare i dette workspace-et."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/w/${slug}/projects/${project.id}`}
                className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl bg-card p-5 ring-1 ring-foreground/8 transition-colors hover:ring-foreground/16"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1 bg-[var(--workspace-accent)]"
                />
                <div className="flex items-start justify-between gap-3 pl-2">
                  <h2 className="font-heading text-section text-foreground group-hover:text-foreground">
                    {project.name}
                  </h2>
                  <ProjectStatusBadge value={project.status} />
                </div>
                <p className="pl-2 font-mono text-label text-muted-foreground">
                  Opprettet {formatDateNb(project.created_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
