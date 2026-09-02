import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  CircleDot,
  FolderKanban,
  ListTodo,
} from "lucide-react";
import type { ReactNode } from "react";

import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { DayTimeline, type TimelineEntry } from "@/components/day-timeline";
import { EmptyState } from "@/components/empty-state";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ProgressBar } from "@/components/progress-bar";
import { PriorityBadge, TaskStatusBadge } from "@/components/status-badge";
import { Surface, surfaceClass } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { WeekHoursChart } from "@/components/week-hours-chart";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import {
  formatDueDateNb,
  formatFullDateNb,
  mondayOfWeek,
  osloHourNow,
  osloStartOfDay,
  todayInOslo,
  weekDatesFrom,
  weekdayShortNb,
} from "@/lib/format";
import { customerLabel, parseCustomFields } from "@/lib/project-types";
import { loggedSecondsByDate } from "@/lib/production-hours";
import { requestClock } from "@/lib/request-clock";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  stage: string;
  project_type_id: string | null;
  custom_fields: unknown;
};

type ProjectTypeRow = { id: string; name: string };

type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "urgent";
  progress: number;
  due_date: string | null;
};

type TimeEntryRow = {
  id: string;
  project_id: string;
  started_at: string;
  ended_at: string | null;
};

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/dashboard`
  );

  const now = await requestClock();
  const today = todayInOslo();
  const dayStart = osloStartOfDay(today);
  const weekDates = weekDatesFrom(today);
  const weekStart = osloStartOfDay(mondayOfWeek(today));

  const [
    projectsResult,
    tasksResult,
    timeEntriesResult,
    runningEntriesResult,
    profileResult,
    projectTypesResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, stage, project_type_id, custom_fields")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .returns<ProjectRow[]>(),
    supabase
      .from("tasks")
      .select(
        "id, project_id, title, status, priority, progress, due_date"
      )
      .eq("workspace_id", workspace.id)
      .returns<TaskRow[]>(),
    supabase
      .from("time_entries")
      .select("id, project_id, started_at, ended_at")
      .eq("workspace_id", workspace.id)
      .gte("ended_at", weekStart.toISOString())
      .order("started_at", { ascending: true })
      .returns<TimeEntryRow[]>(),
    supabase
      .from("time_entries")
      .select("id, project_id, started_at, ended_at")
      .eq("workspace_id", workspace.id)
      .is("ended_at", null)
      .returns<TimeEntryRow[]>(),
    supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .maybeSingle<{ name: string }>(),
    supabase
      .from("project_types")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .returns<ProjectTypeRow[]>(),
  ]);

  if (projectsResult.error) {
    throw projectsResult.error;
  }
  if (tasksResult.error) {
    throw tasksResult.error;
  }
  if (timeEntriesResult.error) {
    throw timeEntriesResult.error;
  }
  if (runningEntriesResult.error) {
    throw runningEntriesResult.error;
  }
  if (projectTypesResult.error) {
    throw projectTypesResult.error;
  }

  const typeNameById = new Map(
    (projectTypesResult.data ?? []).map((row) => [row.id, row.name])
  );
  const projects = projectsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const timeById = new Map<string, TimeEntryRow>();
  for (const row of [
    ...(timeEntriesResult.data ?? []),
    ...(runningEntriesResult.data ?? []),
  ]) {
    timeById.set(row.id, row);
  }
  const timeEntries = [...timeById.values()];

  const activeProjects = projects.filter(
    (project) => project.stage !== "completed"
  );
  const openTasks = tasks.filter((task) => task.status !== "done");
  const inProgress = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;
  const inReview = tasks.filter((task) => task.status === "in_review").length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const completedPct =
    tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  const overdue = openTasks
    .filter((task) => task.due_date !== null && task.due_date < today)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const dueToday = openTasks.filter((task) => task.due_date === today);

  const projectNameById = new Map(
    projects.map((project) => [project.id, project.name])
  );

  const dayEndMs = dayStart.getTime() + 24 * 3_600_000;
  const nowMs = now.getTime();
  const timelineEntries: TimelineEntry[] = timeEntries.flatMap((entry) => {
    const startMs = new Date(entry.started_at).getTime();
    const endMs = entry.ended_at ? new Date(entry.ended_at).getTime() : nowMs;
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      return [];
    }
    if (endMs <= dayStart.getTime() || startMs >= dayEndMs) {
      return [];
    }
    return [
      {
        id: entry.id,
        projectId: entry.project_id,
        projectName: projectNameById.get(entry.project_id) ?? "Ukjent prosjekt",
        startedAt: entry.started_at,
        endedAt: entry.ended_at,
      },
    ];
  });

  const weekSeconds = loggedSecondsByDate(timeEntries, weekDates, nowMs);
  const weekDays = weekDates.map((date, index) => ({
    date,
    label: weekdayShortNb(date),
    seconds: weekSeconds[index],
    isToday: date === today,
  }));
  const weekTotalSeconds = weekSeconds.reduce((sum, value) => sum + value, 0);

  const projectStats = new Map<
    string,
    { total: number; done: number; overdue: number; progress: number }
  >();
  for (const project of activeProjects) {
    const projectTasks = tasks.filter(
      (task) => task.project_id === project.id
    );
    const done = projectTasks.filter((task) => task.status === "done").length;
    const overdueCount = projectTasks.filter(
      (task) =>
        task.status !== "done" &&
        task.due_date !== null &&
        task.due_date < today
    ).length;
    const progress =
      projectTasks.length === 0
        ? 0
        : Math.round(
            projectTasks.reduce((total, task) => total + task.progress, 0) /
              projectTasks.length
          );
    projectStats.set(project.id, {
      total: projectTasks.length,
      done,
      overdue: overdueCount,
      progress,
    });
  }

  const firstName = profileResult.data?.name?.trim().split(/\s+/)[0];

  return (
    <PageFrame>
      <PageHeader
        title={firstName ? `${greetingNb(now)}, ${firstName}` : "Dashboard"}
        description={`${formatFullDateNb(now)} · ${workspace.name}`}
      />

      <DashboardQuickActions slug={slug} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Aktive prosjekter"
          value={activeProjects.length}
          detail={
            projects.length === activeProjects.length
              ? "Ingen fullførte ennå"
              : `${projects.length - activeProjects.length} fullført`
          }
          icon={<FolderKanban className="size-4" />}
        />
        <StatCard
          label="Åpne oppgaver"
          value={openTasks.length}
          detail={
            overdue.length > 0
              ? `${overdue.length} forfalt`
              : "Ingen forfalt"
          }
          detailTone={overdue.length > 0 ? "destructive" : "default"}
          icon={<ListTodo className="size-4" />}
        />
        <StatCard
          label="Pågår"
          value={inProgress}
          detail={`${inReview} til gjennomgang`}
          icon={<CircleDot className="size-4" />}
        />
        <StatCard
          label="Fullført"
          value={completed}
          detail={
            tasks.length === 0
              ? "Ingen oppgaver ennå"
              : `${completedPct} % av alle oppgaver`
          }
          icon={<CheckCircle2 className="size-4" />}
        />
      </section>

      <DayTimeline
        entries={timelineEntries}
        dayStartMs={dayStart.getTime()}
        nowMs={nowMs}
      />

      <WeekHoursChart days={weekDays} totalSeconds={weekTotalSeconds} />

      <Surface className="p-5">
        <h2 className="font-heading text-section">I dag</h2>
        {overdue.length === 0 && dueToday.length === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/50 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-workspace-wash text-workspace-accent">
              <CalendarCheck2 className="size-4" />
            </span>
            <p className="text-sm text-muted-foreground">
              Ingen frister i dag, og ingenting er forfalt. Alt under
              kontroll.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {overdue.length > 0 ? (
              <DueGroup
                label="Forfalt"
                tone="destructive"
                tasks={overdue}
                slug={slug}
                today={today}
                projectNameById={projectNameById}
              />
            ) : null}
            {dueToday.length > 0 ? (
              <DueGroup
                label="Frist i dag"
                tone="default"
                tasks={dueToday}
                slug={slug}
                today={today}
                projectNameById={projectNameById}
              />
            ) : null}
          </div>
        )}
      </Surface>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-section">Aktive prosjekter</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/w/${slug}/projects`}>Alle prosjekter</Link>
          </Button>
        </div>
        {activeProjects.length === 0 ? (
          <EmptyState
            title="Ingen prosjekter ennå"
            description="Opprett det første prosjektet for å fylle dashbordet."
          >
            <Button asChild>
              <Link href={`/w/${slug}/projects#nytt`}>Nytt prosjekt</Link>
            </Button>
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeProjects.map((project) => {
              const stats = projectStats.get(project.id);
              return (
                <li key={project.id}>
                  <Link
                    href={`/w/${slug}/projects/${project.id}`}
                    className={cn(
                      surfaceClass,
                      "group flex h-full flex-col gap-4 p-5 transition-all hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(26,35,48,0.09)]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-workspace-wash">
                          <FolderKanban className="size-4 text-workspace-accent" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-heading text-base font-semibold">
                            {project.name}
                          </h3>
                          <p className="mt-0.5 text-label text-muted-foreground">
                            {[
                              project.project_type_id
                                ? typeNameById.get(project.project_type_id)
                                : undefined,
                              customerLabel(
                                parseCustomFields(project.custom_fields)
                              ),
                            ]
                              .filter((part): part is string => Boolean(part))
                              .join(" · ") || "Uten type"}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <ProgressBar value={stats?.progress ?? 0} />
                    <p className="text-label text-muted-foreground">
                      {stats && stats.total > 0
                        ? `${stats.done}/${stats.total} oppgaver ferdig`
                        : "Ingen oppgaver ennå"}
                      {stats && stats.overdue > 0 ? (
                        <span className="text-destructive">
                          {" "}
                          · {stats.overdue} forfalt
                        </span>
                      ) : null}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageFrame>
  );
}

function DueGroup({
  label,
  tone,
  tasks,
  slug,
  today,
  projectNameById,
}: {
  label: string;
  tone: "default" | "destructive";
  tasks: TaskRow[];
  slug: string;
  today: string;
  projectNameById: Map<string, string>;
}) {
  return (
    <div>
      <p
        className={cn(
          "text-label",
          tone === "destructive" ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {label} · {tasks.length}
      </p>
      <ul className="mt-2 grid gap-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={`/w/${slug}/projects/${task.project_id}`}
              className={cn(
                "group flex items-center gap-3 rounded-xl bg-muted/50 p-3.5 transition-colors hover:bg-muted",
                tone === "destructive" &&
                  "bg-destructive/[0.04] hover:bg-destructive/[0.08]"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-sm font-semibold">
                    {task.title}
                  </p>
                  <PriorityBadge value={task.priority} />
                  <TaskStatusBadge value={task.status} />
                </div>
                <p
                  className={cn(
                    "mt-1 font-mono text-label",
                    tone === "destructive"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {task.due_date && task.due_date < today
                    ? `Forfalt ${formatDueDateNb(task.due_date)}`
                    : `Frist ${formatDueDateNb(task.due_date ?? today)}`}
                  {projectNameById.get(task.project_id)
                    ? ` · ${projectNameById.get(task.project_id)}`
                    : ""}
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  detailTone = "default",
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  detailTone?: "default" | "destructive";
  icon: ReactNode;
}) {
  return (
    <Surface className="px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label text-muted-foreground">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-workspace-wash text-workspace-accent">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-heading text-display tabular-nums">{value}</p>
      <p
        className={cn(
          "mt-1 text-label",
          detailTone === "destructive"
            ? "font-medium text-destructive"
            : "text-muted-foreground"
        )}
      >
        {detail}
      </p>
    </Surface>
  );
}

function greetingNb(now: Date): string {
  const hour = osloHourNow(now);
  if (hour >= 5 && hour < 10) {
    return "God morgen";
  }
  if (hour >= 10 && hour < 17) {
    return "God dag";
  }
  return "God kveld";
}
