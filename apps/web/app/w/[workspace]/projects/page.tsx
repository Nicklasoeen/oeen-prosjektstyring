import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { CreateProjectForm } from "@/components/create-project-form";
import { EmptyState } from "@/components/empty-state";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ProjectStageBadge } from "@/components/status-badge";
import { Surface, surfaceClass } from "@/components/surface";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { formatDateNb } from "@/lib/format";
import { isProjectStage } from "@/lib/projects";
import {
  customerLabel,
  parseChecklistTemplate,
  parseCustomFields,
  parseFieldSchema,
  type ProjectTypeSummary,
} from "@/lib/project-types";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  stage: string;
  project_type_id: string | null;
  custom_fields: unknown;
  created_at: string;
};

type TypeRow = {
  id: string;
  name: string;
  field_schema: unknown;
  checklist_template: unknown;
  sort_order: number;
};

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error } = await searchParams;
  const { workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects`
  );

  const [projectsResult, typesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, stage, project_type_id, custom_fields, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .returns<ProjectRow[]>(),
    supabase
      .from("project_types")
      .select("id, name, field_schema, checklist_template, sort_order")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: true })
      .returns<TypeRow[]>(),
  ]);

  if (projectsResult.error) {
    throw projectsResult.error;
  }
  if (typesResult.error) {
    throw typesResult.error;
  }

  const projects = projectsResult.data ?? [];
  const types: ProjectTypeSummary[] = (typesResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    fields: parseFieldSchema(row.field_schema),
    checklist: parseChecklistTemplate(row.checklist_template),
    sortOrder: row.sort_order,
  }));
  const typeNameById = new Map(types.map((type) => [type.id, type.name]));

  return (
    <PageFrame>
      <PageHeader
        title="Prosjekter"
        description={`Arbeid som hører til ${workspace.name}.`}
      />

      <Surface id="nytt" className="scroll-mt-6 p-5">
        <CreateProjectForm slug={slug} types={types} error={error} />
      </Surface>

      {projects.length === 0 ? (
        <EmptyState
          title="Ingen prosjekter ennå"
          description="Gi det første prosjektet et navn og en type — det blir synlig bare i dette workspace-et."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => {
            const typeLabel = project.project_type_id
              ? typeNameById.get(project.project_type_id)
              : undefined;
            const customer = customerLabel(
              parseCustomFields(project.custom_fields)
            );
            const meta = [typeLabel ?? "Uten type", customer]
              .filter((part): part is string => Boolean(part))
              .join(" · ");
            return (
              <li key={project.id}>
                <Link
                  href={`/w/${slug}/projects/${project.id}`}
                  className={cn(surfaceClass, "group flex h-full flex-col gap-4 p-5")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FolderKanban className="size-4 text-workspace-accent" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-heading text-section text-foreground">
                          {project.name}
                        </h2>
                        <p className="mt-1 text-label text-muted-foreground">
                          {meta}
                        </p>
                      </div>
                    </div>
                    <ProjectStageBadge
                      value={
                        isProjectStage(project.stage) ? project.stage : "new"
                      }
                    />
                  </div>
                  <p className="font-mono text-label text-muted-foreground">
                    Opprettet {formatDateNb(project.created_at)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageFrame>
  );
}
