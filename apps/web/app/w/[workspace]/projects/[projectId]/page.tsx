import Link from "next/link";
import { Clock } from "lucide-react";

import { createTask } from "@/app/w/[workspace]/projects/actions";
import { KanbanBoard, type KanbanMember, type KanbanTask } from "@/components/kanban-board";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ProjectDetailsForm } from "@/components/project-details-form";
import { ProjectNotes } from "@/components/project-notes";
import { ProjectTabs } from "@/components/project-tabs";
import { Surface } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canEditWorkspace } from "@/lib/auth/workspace-access";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { formatLoggedDuration } from "@/lib/format";
import {
  isProjectType,
  isTaskPriority,
  isTaskStatus,
  PROJECT_TYPE_LABELS,
  resolveProjectTab,
  type ProjectType,
} from "@/lib/projects";
import { redirect } from "next/navigation";

type ProjectRow = {
  id: string;
  name: string;
  status: "active" | "archived";
  type: string;
  domain: string | null;
  production_domain: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  section: string | null;
  priority: string;
  due_date: string | null;
};

type AssigneeRow = { task_id: string; user_id: string };
type MemberRow = { user_id: string };
type UserRow = { id: string; name: string; email: string };
type TimeRow = { started_at: string; ended_at: string | null };
type RunningRow = { task_id: string };

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; projectId: string }>;
  searchParams: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  const { workspace: slug, projectId } = await params;
  const { tab: tabParam, saved, error } = await searchParams;
  const tab = resolveProjectTab(tabParam);
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects/${projectId}`
  );
  const canEdit = canEditWorkspace(workspace.role);

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, status, type, domain, production_domain, contact_name, contact_email, notes"
    )
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<ProjectRow>();

  if (!project) {
    redirect(`/w/${slug}/projects`);
  }

  const projectType: ProjectType = isProjectType(project.type)
    ? project.type
    : "other";
  const hrefBase = `/w/${slug}/projects/${project.id}`;

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, status, section, priority, due_date")
    .eq("project_id", project.id)
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (taskError) {
    throw taskError;
  }

  const tasks = taskRows ?? [];
  const taskIds = tasks.map((task) => task.id);

  const [assigneesResult, membersResult, runningResult, timeResult] =
    await Promise.all([
      taskIds.length > 0
        ? supabase
            .from("task_assignees")
            .select("task_id, user_id")
            .eq("workspace_id", workspace.id)
            .in("task_id", taskIds)
            .returns<AssigneeRow[]>()
        : Promise.resolve({ data: [] as AssigneeRow[], error: null }),
      supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id)
        .returns<MemberRow[]>(),
      taskIds.length > 0
        ? supabase
            .from("time_entries")
            .select("task_id")
            .eq("workspace_id", workspace.id)
            .eq("user_id", userId)
            .in("task_id", taskIds)
            .is("ended_at", null)
            .returns<RunningRow[]>()
        : Promise.resolve({ data: [] as RunningRow[], error: null }),
      taskIds.length > 0
        ? supabase
            .from("time_entries")
            .select("started_at, ended_at")
            .eq("workspace_id", workspace.id)
            .in("task_id", taskIds)
            .not("ended_at", "is", null)
            .returns<TimeRow[]>()
        : Promise.resolve({ data: [] as TimeRow[], error: null }),
    ]);

  if (assigneesResult.error) {
    throw assigneesResult.error;
  }
  if (membersResult.error) {
    throw membersResult.error;
  }
  if (runningResult.error) {
    throw runningResult.error;
  }
  if (timeResult.error) {
    throw timeResult.error;
  }

  const memberIds = (membersResult.data ?? []).map((row) => row.user_id);
  const { data: userRows, error: usersError } =
    memberIds.length > 0
      ? await supabase
          .from("users")
          .select("id, name, email")
          .in("id", memberIds)
          .returns<UserRow[]>()
      : { data: [] as UserRow[], error: null };

  if (usersError) {
    throw usersError;
  }

  const members: KanbanMember[] = (userRows ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));
  const assigneeIdsByTask = new Map<string, string[]>();
  for (const row of assigneesResult.data ?? []) {
    const current = assigneeIdsByTask.get(row.task_id) ?? [];
    current.push(row.user_id);
    assigneeIdsByTask.set(row.task_id, current);
  }
  const runningByTaskId = new Set(
    (runningResult.data ?? []).map((row) => row.task_id)
  );

  const loggedSeconds = (timeResult.data ?? []).reduce((total, row) => {
    if (!row.ended_at) {
      return total;
    }
    const start = new Date(row.started_at).getTime();
    const end = new Date(row.ended_at).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return total;
    }
    return total + (end - start) / 1000;
  }, 0);

  const kanbanTasks: KanbanTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: isTaskStatus(task.status) ? task.status : "todo",
    section: task.section,
    priority: isTaskPriority(task.priority) ? task.priority : "medium",
    due_date: task.due_date,
    assigneeIds: assigneeIdsByTask.get(task.id) ?? [],
    running: runningByTaskId.has(task.id),
  }));

  const sections = [
    ...new Set(
      tasks
        .map((task) => task.section)
        .filter((section): section is string => Boolean(section))
    ),
  ];

  return (
    <PageFrame wide>
      <PageHeader
        title={project.name}
        description={
          <>
            <Link
              href={`/w/${slug}/projects`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Prosjekter
            </Link>
            <span> · {PROJECT_TYPE_LABELS[projectType]}</span>
          </>
        }
      />
      <ProjectTabs hrefBase={hrefBase} active={tab} />

      {tab === "oversikt" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]">
          <Surface className="p-5">
            <ProjectNotes
              key={project.id}
              slug={slug}
              projectId={project.id}
              notes={project.notes ?? ""}
              canEdit={canEdit}
            />
          </Surface>
          <Surface className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-label text-muted-foreground">Tid logget</p>
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-workspace-accent">
                <Clock className="size-4" />
              </span>
            </div>
            <p className="mt-3 font-heading text-display tabular-nums">
              {formatLoggedDuration(loggedSeconds)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sum av avsluttede tidsregistreringer i prosjektet.
            </p>
          </Surface>
        </div>
      ) : null}

      {tab === "oppgaver" ? (
        <div className="space-y-4">
          {canEdit ? (
            <Surface className="p-5">
              <form
                action={createTask}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <input type="hidden" name="workspace_slug" value={slug} />
                <input type="hidden" name="project_id" value={project.id} />
                <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                  <Label htmlFor="title">Ny oppgave</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    placeholder="F.eks. Skrive tilbud"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioritet</Label>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue="medium"
                    className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    <option value="low">Lav</option>
                    <option value="medium">Middels</option>
                    <option value="urgent">Haster</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Frist</Label>
                  <Input id="due_date" name="due_date" type="date" className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Seksjon</Label>
                  <Input
                    id="section"
                    name="section"
                    list="task-sections"
                    placeholder="Valgfritt"
                    className="h-10"
                  />
                  <datalist id="task-sections">
                    {sections.map((section) => (
                      <option key={section} value={section} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="h-10 w-full">
                    Opprett oppgave
                  </Button>
                </div>
              </form>
            </Surface>
          ) : null}
          <KanbanBoard
            slug={slug}
            projectId={project.id}
            tasks={kanbanTasks}
            members={members}
            canEdit={canEdit}
          />
        </div>
      ) : null}

      {tab === "detaljer" ? (
        <Surface className="p-6">
          <ProjectDetailsForm
            slug={slug}
            projectId={project.id}
            type={projectType}
            domain={project.domain}
            productionDomain={project.production_domain}
            contactName={project.contact_name}
            contactEmail={project.contact_email}
            canEdit={canEdit}
            saved={saved === "1"}
            error={error === "invalid" || error === "email" ? error : undefined}
          />
        </Surface>
      ) : null}
    </PageFrame>
  );
}
