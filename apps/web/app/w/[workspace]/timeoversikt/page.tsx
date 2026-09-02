import Link from "next/link";
import { ArrowUpRight, Timer } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ProgressBar } from "@/components/progress-bar";
import { Surface, surfaceClass } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { formatHoursNb, formatLoggedDuration } from "@/lib/format";
import { loggedSeconds } from "@/lib/production-hours";
import { requestClock } from "@/lib/request-clock";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  stage: string;
  estimated_hours: string | number | null;
};

type TimeRow = {
  project_id: string;
  started_at: string;
  ended_at: string | null;
};

export default async function TimeoversiktPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/timeoversikt`
  );

  const now = await requestClock();
  const nowMs = now.getTime();

  const [projectsResult, timeResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, stage, estimated_hours")
      .eq("workspace_id", workspace.id)
      .returns<ProjectRow[]>(),
    supabase
      .from("time_entries")
      .select("project_id, started_at, ended_at")
      .eq("workspace_id", workspace.id)
      .returns<TimeRow[]>(),
  ]);

  if (projectsResult.error) {
    throw projectsResult.error;
  }
  if (timeResult.error) {
    throw timeResult.error;
  }

  const activeProjects = (projectsResult.data ?? []).filter(
    (project) => project.stage !== "completed"
  );
  const activeIds = new Set(activeProjects.map((project) => project.id));

  const entriesByProject = new Map<string, TimeRow[]>();
  for (const entry of timeResult.data ?? []) {
    if (!activeIds.has(entry.project_id)) {
      continue;
    }
    const list = entriesByProject.get(entry.project_id) ?? [];
    list.push(entry);
    entriesByProject.set(entry.project_id, list);
  }

  const rows = activeProjects
    .map((project) => {
      const estimated = parseEstimatedHours(project.estimated_hours);
      const seconds = loggedSeconds(
        entriesByProject.get(project.id) ?? [],
        nowMs
      );
      return {
        id: project.id,
        name: project.name,
        estimated,
        loggedHours: seconds / 3600,
        loggedLabel: formatLoggedDuration(seconds),
      };
    })
    .sort((a, b) => b.loggedHours - a.loggedHours);

  const loggedTotalHours = rows.reduce((sum, row) => sum + row.loggedHours, 0);
  const estimatedTotal = rows.reduce(
    (sum, row) => sum + (row.estimated ?? 0),
    0
  );
  const missingEstimate = rows.filter((row) => row.estimated === null).length;

  return (
    <PageFrame>
      <PageHeader
        title="Timeoversikt"
        description={
          <>
            <Link
              href={`/w/${slug}/dashboard`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Dashboard
            </Link>
            <span> · Førte timer på aktive prosjekter.</span>
          </>
        }
      />

      {activeProjects.length === 0 ? (
        <EmptyState
          title="Ingen aktive prosjekter"
          description="Opprett et prosjekt og start timern for å fylle oversikten."
        >
          <Button asChild>
            <Link href={`/w/${slug}/projects#nytt`}>Nytt prosjekt</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <Surface className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-label text-muted-foreground">
                Ført mot estimat
              </p>
              <span className="flex size-8 items-center justify-center rounded-lg bg-workspace-wash text-workspace-accent">
                <Timer className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-heading text-display tabular-nums">
              {formatLoggedDuration(loggedTotalHours * 3600)}
              <span className="text-base font-medium text-muted-foreground">
                {estimatedTotal > 0
                  ? ` av ${formatHoursNb(estimatedTotal)} t`
                  : ""}
              </span>
            </p>
            {estimatedTotal > 0 ? (
              <>
                <ProgressBar
                  value={(loggedTotalHours / estimatedTotal) * 100}
                  className="mt-3"
                />
                <p
                  className={
                    loggedTotalHours > estimatedTotal
                      ? "mt-2 text-label font-medium text-destructive"
                      : "mt-2 text-label text-muted-foreground"
                  }
                >
                  {loggedTotalHours > estimatedTotal
                    ? `${formatLoggedDuration((loggedTotalHours - estimatedTotal) * 3600)} over samlet estimat`
                    : `${formatLoggedDuration((estimatedTotal - loggedTotalHours) * 3600)} igjen av samlet estimat`}
                  {missingEstimate > 0
                    ? ` · ${missingEstimate} uten estimat`
                    : ""}
                </p>
              </>
            ) : (
              <p className="mt-2 text-label text-muted-foreground">
                Ingen av de aktive prosjektene har timeestimat ennå. Sett det
                under Detaljer.
              </p>
            )}
          </Surface>

          <ul className="grid gap-3">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/w/${slug}/projects/${row.id}`}
                  className={cn(
                    surfaceClass,
                    "group flex flex-col gap-3 p-5 transition-all hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(26,35,48,0.09)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-heading text-section">
                        {row.name}
                      </h2>
                      <p className="mt-1 font-mono text-label tabular-nums text-muted-foreground">
                        {row.loggedLabel} ført
                        {row.estimated !== null
                          ? ` av ${formatHoursNb(row.estimated)} t`
                          : " · uten estimat"}
                      </p>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  {row.estimated !== null && row.estimated > 0 ? (
                    <ProgressBar
                      value={(row.loggedHours / row.estimated) * 100}
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageFrame>
  );
}

function parseEstimatedHours(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}
