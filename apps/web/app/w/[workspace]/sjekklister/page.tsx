import Link from "next/link";
import { ArrowUpRight, Circle } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { Surface } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";

type ProjectRow = { id: string; name: string; stage: string };

type ChecklistRow = {
  id: string;
  project_id: string;
  label: string;
};

export default async function SjekklisterPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/sjekklister`
  );

  const [projectsResult, itemsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, stage")
      .eq("workspace_id", workspace.id)
      .order("name", { ascending: true })
      .returns<ProjectRow[]>(),
    supabase
      .from("project_checklist_items")
      .select("id, project_id, label")
      .eq("workspace_id", workspace.id)
      .eq("checked", false)
      .order("created_at", { ascending: true })
      .returns<ChecklistRow[]>(),
  ]);

  if (projectsResult.error) {
    throw projectsResult.error;
  }
  if (itemsResult.error) {
    throw itemsResult.error;
  }

  const activeProjects = (projectsResult.data ?? []).filter(
    (project) => project.stage !== "completed"
  );
  const activeIds = new Set(activeProjects.map((project) => project.id));
  const itemsByProject = new Map<string, ChecklistRow[]>();
  for (const item of itemsResult.data ?? []) {
    if (!activeIds.has(item.project_id)) {
      continue;
    }
    const list = itemsByProject.get(item.project_id) ?? [];
    list.push(item);
    itemsByProject.set(item.project_id, list);
  }

  const groups = activeProjects
    .map((project) => ({
      id: project.id,
      name: project.name,
      items: itemsByProject.get(project.id) ?? [],
    }))
    .filter((group) => group.items.length > 0);

  const outstanding = groups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  return (
    <PageFrame>
      <PageHeader
        title="Sjekklister"
        description={
          <>
            <Link
              href={`/w/${slug}/dashboard`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Dashboard
            </Link>
            <span>
              {" "}
              · {outstanding} åpne punkt
              {outstanding === 1 ? "" : "er"} på aktive prosjekter.
            </span>
          </>
        }
      />

      {activeProjects.length === 0 ? (
        <EmptyState
          title="Ingen aktive prosjekter"
          description="Sjekklistene vises her når du har prosjekter som ikke er fullført."
        >
          <Button asChild>
            <Link href={`/w/${slug}/projects#nytt`}>Nytt prosjekt</Link>
          </Button>
        </EmptyState>
      ) : groups.length === 0 ? (
        <EmptyState
          title="Alt er huket av"
          description="Ingen åpne sjekkpunkt på de aktive prosjektene. Bra jobba."
        >
          <Button asChild variant="outline">
            <Link href={`/w/${slug}/dashboard`}>Tilbake til dashbordet</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <Surface key={group.id} className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-heading text-section">
                  <Link
                    href={`/w/${slug}/projects/${group.id}`}
                    className="inline-flex items-center gap-2 hover:underline"
                  >
                    {group.name}
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                  </Link>
                </h2>
                <p className="text-label text-muted-foreground">
                  {group.items.length} åpne
                </p>
              </div>
              <ul className="mt-4 grid gap-2">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl bg-muted/50 px-3.5 py-3"
                  >
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-foreground">{item.label}</p>
                  </li>
                ))}
              </ul>
            </Surface>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
