import Link from "next/link";

import { seedDefaultProjectTypes } from "@/app/w/[workspace]/settings/project-type-actions";
import { EmptyState } from "@/components/empty-state";
import { PageFrame, PageHeader } from "@/components/page-frame";
import {
  NewProjectTypeForm,
  ProjectTypeEditor,
} from "@/components/project-type-editor";
import { Surface } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { canEditWorkspace } from "@/lib/auth/workspace-access";
import {
  parseChecklistTemplate,
  parseFieldSchema,
  type ProjectTypeSummary,
} from "@/lib/project-types";

type TypeRow = {
  id: string;
  name: string;
  field_schema: unknown;
  checklist_template: unknown;
  sort_order: number;
};

type ProjectTypeCountRow = { project_type_id: string | null };

const STATUS_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> = {
  created: { tone: "ok", text: "Prosjekttypen er opprettet." },
  saved: { tone: "ok", text: "Endringene er lagret." },
  deleted: { tone: "ok", text: "Prosjekttypen er slettet." },
  invalid: { tone: "error", text: "Gi typen et navn før du lagrer." },
  duplicate: {
    tone: "error",
    text: "Det finnes allerede en prosjekttype med dette navnet.",
  },
  in_use: {
    tone: "error",
    text: "Typen er i bruk. Flytt prosjektene til en annen type først.",
  },
};

export default async function ProjectTypesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { workspace: slug } = await params;
  const { status } = await searchParams;
  const { workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings/prosjekttyper`
  );
  const canEdit = canEditWorkspace(workspace.role);

  const [typesResult, projectsResult] = await Promise.all([
    supabase
      .from("project_types")
      .select("id, name, field_schema, checklist_template, sort_order")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: true })
      .returns<TypeRow[]>(),
    supabase
      .from("projects")
      .select("project_type_id")
      .eq("workspace_id", workspace.id)
      .returns<ProjectTypeCountRow[]>(),
  ]);

  if (typesResult.error) {
    throw typesResult.error;
  }
  if (projectsResult.error) {
    throw projectsResult.error;
  }

  const types: ProjectTypeSummary[] = (typesResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    fields: parseFieldSchema(row.field_schema),
    checklist: parseChecklistTemplate(row.checklist_template),
    sortOrder: row.sort_order,
  }));

  const usageByTypeId = new Map<string, number>();
  for (const row of projectsResult.data ?? []) {
    if (row.project_type_id) {
      usageByTypeId.set(
        row.project_type_id,
        (usageByTypeId.get(row.project_type_id) ?? 0) + 1
      );
    }
  }

  const message = status ? STATUS_MESSAGES[status] : undefined;

  return (
    <PageFrame>
      <PageHeader
        title="Prosjekttyper"
        description={
          <>
            <Link
              href={`/w/${slug}/settings`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Innstillinger
            </Link>
            <span>
              {" "}
              · Hver type bestemmer hvilke felter og sjekkpunkter nye
              prosjekter får.
            </span>
          </>
        }
        actions={canEdit ? <NewProjectTypeForm slug={slug} /> : undefined}
      />

      {message ? (
        <p
          className={
            message.tone === "ok"
              ? "text-sm text-workspace-accent"
              : "text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      ) : null}

      {types.length === 0 ? (
        <EmptyState
          title="Ingen prosjekttyper ennå"
          description="Start med standardsettet (Custom nettside, Landingsside, Grafisk, Annet) og tilpass det etterpå — eller bygg dine egne fra bunnen."
        >
          {canEdit ? (
            <form action={seedDefaultProjectTypes}>
              <input type="hidden" name="workspace_slug" value={slug} />
              <Button type="submit">Legg til standardtyper</Button>
            </form>
          ) : null}
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          {types.map((type) => (
            <Surface key={type.id} className="p-6">
              <ProjectTypeEditor
                slug={slug}
                type={type}
                projectsUsing={usageByTypeId.get(type.id) ?? 0}
                canEdit={canEdit}
              />
            </Surface>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
