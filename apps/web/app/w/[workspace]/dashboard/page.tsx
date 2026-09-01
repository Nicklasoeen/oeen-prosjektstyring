import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  FolderKanban,
  ListTodo,
} from "lucide-react";
import type { ReactNode } from "react";

import { ChatLaunch } from "@/components/chat-launch";
import { EmptyState } from "@/components/empty-state";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ProgressBar } from "@/components/progress-bar";
import { PriorityBadge, TaskStatusBadge } from "@/components/status-badge";
import { Surface, surfaceClass } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import {
  formatDueDateNb,
  formatRelativeNb,
  todayInOslo,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  status: "active" | "archived";
};

type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  status: "todo" | "doing" | "done";
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

  const [projectsResult, tasksResult, activityResult, credentialResult] =
    await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status")
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

  const projects = projectsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const activity = activityResult.data ?? [];
  const today = todayInOslo();

  const activeProjects = projects.filter((project) => project.status === "active");
  const inProgress = tasks.filter((task) => task.status === "doing").length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const dueToday = tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.due_date !== null &&
      (task.due_date === today || task.due_date < today)
  );

  const progressByProject = new Map<string, number>();
  for (const project of activeProjects) {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    if (projectTasks.length === 0) {
      progressByProject.set(project.id, 0);
      continue;
    }
    const sum = projectTasks.reduce((total, task) => total + task.progress, 0);
    progressByProject.set(project.id, Math.round(sum / projectTasks.length));
  }

  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const taskTitleById = new Map(tasks.map((task) => [task.id, task.title]));

  return (
    <PageFrame>
      <PageHeader
        title="Dashboard"
        description={`Oversikt for ${workspace.name}.`}
        actions={
          <Button asChild>
            <Link href={`/w/${slug}/projects#nytt`}>Nytt prosjekt</Link>
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Aktive prosjekter"
          value={activeProjects.length}
          icon={<FolderKanban className="size-4" />}
        />
        <StatCard
          label="Oppgaver"
          value={tasks.length}
          icon={<ListTodo className="size-4" />}
        />
        <StatCard
          label="Pågår"
          value={inProgress}
          icon={<CircleDot className="size-4" />}
        />
        <StatCard
          label="Ferdig"
          value={completed}
          icon={<CheckCircle2 className="size-4" />}
        />
      </section>

      <ChatLaunch slug={slug} hasKey={Boolean(credentialResult.data)} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Surface className="p-5">
          <h2 className="font-heading text-section">I dag</h2>
          {dueToday.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Ingen oppgaver med frist i dag eller forfalt.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {dueToday.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/w/${slug}/projects/${task.project_id}`}
                    className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-sm font-semibold">
                        {task.title}
                      </p>
                      <PriorityBadge value={task.priority} />
                      <TaskStatusBadge value={task.status} />
                    </div>
                    <p
                      className={cn(
                        "font-mono text-label",
                        task.due_date && task.due_date < today
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
                    <ProgressBar value={task.progress} className="max-w-xs" />
                  </Link>
                </li>
              ))}
            </ul>
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
            <ul className="mt-2 divide-y divide-border">
              {activity.map((row) => (
                <li key={row.id} className="py-3">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">
                      {row.user_id === userId ? "Du" : "Noen"}
                    </span>{" "}
                    {activityVerb(row.action, row.entity_type)}
                    {activitySubject(row, projectNameById, taskTitleById)}
                  </p>
                  <p className="mt-0.5 font-mono text-label text-muted-foreground">
                    {formatRelativeNb(row.created_at)}
                  </p>
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
          <ul className="grid gap-4 sm:grid-cols-2">
            {activeProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/w/${slug}/projects/${project.id}`}
                  className={cn(
                    surfaceClass,
                    "group flex h-full flex-col gap-4 p-5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FolderKanban className="size-4 text-workspace-accent" />
                    </span>
                    <h3 className="font-heading text-section">{project.name}</h3>
                  </div>
                  <ProgressBar
                    value={progressByProject.get(project.id) ?? 0}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageFrame>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <Surface className="px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label text-muted-foreground">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-workspace-accent">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-heading text-display tabular-nums">{value}</p>
    </Surface>
  );
}

function activityVerb(action: string, entityType: string): string {
  if (action === "created" && entityType === "project") {
    return "opprettet prosjektet";
  }
  if (action === "created" && entityType === "task") {
    return "opprettet oppgaven";
  }
  if (action === "timer.started") {
    return "startet timer";
  }
  if (action === "timer.stopped") {
    return "stoppet timer";
  }
  if (action === "updated" && entityType === "workspace") {
    return "oppdaterte workspace-et";
  }
  if (action === "left") {
    return "forlot workspace-et";
  }
  return action;
}

function activitySubject(
  row: ActivityRow,
  projectNameById: Map<string, string>,
  taskTitleById: Map<string, string>
): string {
  if (row.entity_type === "project") {
    const name = projectNameById.get(row.entity_id);
    return name ? ` ${name}` : "";
  }
  if (row.entity_type === "task") {
    const name = taskTitleById.get(row.entity_id);
    return name ? ` ${name}` : "";
  }
  return "";
}
