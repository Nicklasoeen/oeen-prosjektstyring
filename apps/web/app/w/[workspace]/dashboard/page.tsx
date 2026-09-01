import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  CircleDot,
  FolderKanban,
  FolderPlus,
  ListPlus,
  ListTodo,
  LogOut,
  Pencil,
  Play,
  Square,
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
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import {
  formatDueDateNb,
  formatFullDateNb,
  formatRelativeNb,
  osloHourNow,
  osloStartOfDay,
  todayInOslo,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  stage: string;
  type: "custom_website" | "landing_page" | "graphic" | "other";
};

type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "urgent";
  progress: number;
  due_date: string | null;
};

type ActivityRow = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
};

type TimeEntryRow = {
  id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
};

const PROJECT_TYPE_LABELS: Record<ProjectRow["type"], string> = {
  custom_website: "Nettside",
  landing_page: "Landingsside",
  graphic: "Grafisk",
  other: "Annet",
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

  const [
    projectsResult,
    tasksResult,
    activityResult,
    credentialResult,
    timeEntriesResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, stage, type")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .returns<ProjectRow[]>(),
    supabase
      .from("tasks")
      .select("id, project_id, title, status, priority, progress, due_date")
      .eq("workspace_id", workspace.id)
      .returns<TaskRow[]>(),
    supabase
      .from("activity_log")
      .select("id, user_id, entity_type, entity_id, action, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<ActivityRow[]>(),
    supabase
      .from("user_credentials")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "anthropic")
      .maybeSingle<{ id: string }>(),
    supabase
      .from("time_entries")
      .select("id, task_id, started_at, ended_at")
      .eq("workspace_id", workspace.id)
      .gte("started_at", dayStart.toISOString())
      .order("started_at", { ascending: true })
      .returns<TimeEntryRow[]>(),
    supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .maybeSingle<{ name: string }>(),
  ]);

  if (projectsResult.error) {
    throw projectsResult.error;
  }
  if (tasksResult.error) {
    throw tasksResult.error;
  }
  if (activityResult.error) {
    throw activityResult.error;
  }
  if (credentialResult.error) {
    throw credentialResult.error;
  }
  if (timeEntriesResult.error) {
    throw timeEntriesResult.error;
  }

  const projects = projectsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const activity = activityResult.data ?? [];
  const timeEntries = timeEntriesResult.data ?? [];

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

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const projectNameById = new Map(
    projects.map((project) => [project.id, project.name])
  );

  const timelineEntries: TimelineEntry[] = timeEntries.map((entry) => ({
    id: entry.id,
    taskId: entry.task_id,
    taskTitle: taskById.get(entry.task_id)?.title ?? "Ukjent oppgave",
    startedAt: entry.started_at,
    endedAt: entry.ended_at,
  }));

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

      <DashboardQuickActions
        slug={slug}
        hasKey={Boolean(credentialResult.data)}
      />

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
        nowMs={now.getTime()}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
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

        <Surface className="p-5">
          <h2 className="font-heading text-section">Aktivitet</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Når du oppretter prosjekter, oppgaver eller starter timer, vises
              det her.
            </p>
          ) : (
            <ul className="mt-4 space-y-1">
              {activity.map((row) => (
                <li key={row.id} className="flex gap-3 rounded-lg px-1 py-2">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-3.5">
                    {activityIcon(row.action, row.entity_type)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">
                        {row.user_id === userId ? "Du" : "Noen"}
                      </span>{" "}
                      {activityVerb(row.action, row.entity_type)}
                      {activitySubject(row, projectNameById, taskById)}
                    </p>
                    <p className="mt-0.5 font-mono text-label text-muted-foreground">
                      {formatRelativeNb(row.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

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
                            {PROJECT_TYPE_LABELS[project.type]}
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

async function requestClock(): Promise<Date> {
  await connection();
  return new Date();
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

function activityIcon(action: string, entityType: string): ReactNode {
  if (action === "created" && entityType === "project") {
    return <FolderPlus />;
  }
  if (action === "created" && entityType === "task") {
    return <ListPlus />;
  }
  if (action === "timer.started") {
    return <Play />;
  }
  if (action === "timer.stopped") {
    return <Square />;
  }
  if (action === "left") {
    return <LogOut />;
  }
  return <Pencil />;
}

function activityVerb(action: string, entityType: string): string {
  if (action === "created" && entityType === "project") {
    return "opprettet prosjektet";
  }
  if (action === "created" && entityType === "task") {
    return "opprettet oppgaven";
  }
  if (action === "created" && entityType === "project_note") {
    return "skrev et notat";
  }
  if (action === "created" && entityType === "checklist_item") {
    return "la til et sjekkpunkt";
  }
  if (action === "timer.started") {
    return "startet timer";
  }
  if (action === "timer.stopped") {
    return "stoppet timer";
  }
  if (action === "stage.changed") {
    return "flyttet prosjektet til ny fase";
  }
  if (action === "updated" && entityType === "workspace") {
    return "oppdaterte workspace-et";
  }
  if (action === "updated" && entityType === "project") {
    return "oppdaterte prosjektet";
  }
  if (action === "updated" && entityType === "task") {
    return "oppdaterte oppgaven";
  }
  if (action === "updated" && entityType === "checklist_item") {
    return "oppdaterte sjekklisten";
  }
  if (action === "updated" && entityType === "project_note") {
    return "flyttet et notat";
  }
  if (action === "left") {
    return "forlot workspace-et";
  }
  return action;
}

function activitySubject(
  row: ActivityRow,
  projectNameById: Map<string, string>,
  taskById: Map<string, TaskRow>
): string {
  if (row.entity_type === "project") {
    const name = projectNameById.get(row.entity_id);
    return name ? ` ${name}` : "";
  }
  if (row.entity_type === "task") {
    const name = taskById.get(row.entity_id)?.title;
    return name ? ` ${name}` : "";
  }
  return "";
}
