import Link from "next/link";
import { redirect } from "next/navigation";
import { PartyPopper, Timer } from "lucide-react";

import { createTask } from "@/app/w/[workspace]/projects/actions";
import {
  KanbanBoard,
  type KanbanMember,
  type KanbanTask,
} from "@/components/kanban-board";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ProgressBar } from "@/components/progress-bar";
import {
  ProjectChecklist,
  type ChecklistItem,
} from "@/components/project-checklist";
import { ProjectDetailsForm } from "@/components/project-details-form";
import {
  ProjectNotesPanel,
  type ProjectNote,
} from "@/components/project-notes-panel";
import { ProjectStageControl } from "@/components/project-stage-control";
import { ProjectTabs } from "@/components/project-tabs";
import { Surface } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canEditWorkspace } from "@/lib/auth/workspace-access";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { formatLoggedDuration } from "@/lib/format";
import {
  isProjectStage,
  isProjectType,
  isTaskCategory,
  isTaskPriority,
  isTaskStatus,
  PRODUCTION_CATEGORIES,
  PROJECT_TYPE_LABELS,
  resolveProjectTab,
  TASK_CATEGORY_LABELS,
  type ProjectStage,
  type ProjectType,
} from "@/lib/projects";

type ProjectRow = {
  id: string;
  name: string;
  stage: string;
  type: string;
  customer_name: string;
  contact_name: string | null;
  contact_email: string | null;
  old_website_url: string | null;
  domain: string | null;
  production_domain: string | null;
  estimated_hours: string | number | null;
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  section: string | null;
  category: string;
  priority: string;
  due_date: string | null;
};

type AssigneeRow = { task_id: string; user_id: string };
type MemberRow = { user_id: string };
type UserRow = { id: string; name: string; email: string };
type TimeRow = { task_id: string; started_at: string; ended_at: string | null };
type RunningRow = { task_id: string };
type ChecklistRow = {
  id: string;
  label: string;
  checked: boolean;
  is_custom: boolean;
};
type NoteRow = {
  id: string;
  user_id: string;
  body: string;
  stage: string | null;
  created_at: string;
};

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
      "id, name, stage, type, customer_name, contact_name, contact_email, old_website_url, domain, production_domain, estimated_hours"
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
  const projectStage: ProjectStage = isProjectStage(project.stage)
    ? project.stage
    : "new";
  const estimatedHours =
    project.estimated_hours === null ? null : Number(project.estimated_hours);
  const hrefBase = `/w/${slug}/projects/${project.id}`;

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, status, section, category, priority, due_date")
    .eq("project_id", project.id)
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (taskError) {
    throw taskError;
  }

  const tasks = taskRows ?? [];
  const taskIds = tasks.map((task) => task.id);

  const [
    assigneesResult,
    membersResult,
    runningResult,
    timeResult,
    checklistResult,
    notesResult,
  ] = await Promise.all([
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
          .select("task_id, started_at, ended_at")
          .eq("workspace_id", workspace.id)
          .in("task_id", taskIds)
          .not("ended_at", "is", null)
          .returns<TimeRow[]>()
      : Promise.resolve({ data: [] as TimeRow[], error: null }),
    supabase
      .from("project_checklist_items")
      .select("id, label, checked, is_custom")
      .eq("project_id", project.id)
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true })
      .returns<ChecklistRow[]>(),
    supabase
      .from("project_notes")
      .select("id, user_id, body, stage, created_at")
      .eq("project_id", project.id)
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .returns<NoteRow[]>(),
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
  if (checklistResult.error) {
    throw checklistResult.error;
  }
  if (notesResult.error) {
    throw notesResult.error;
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
  const authorNameById = Object.fromEntries(
    (userRows ?? []).map((user) => [user.id, user.name])
  );
  const assigneeIdsByTask = new Map<string, string[]>();
  for (const row of assigneesResult.data ?? []) {
    const current = assigneeIdsByTask.get(row.task_id) ?? [];
    current.push(row.user_id);
    assigneeIdsByTask.set(row.task_id, current);
  }
  const runningByTaskId = new Set(
    (runningResult.data ?? []).map((row) => row.task_id)
  );

  // Live production-hours calculation: only design/development tasks count.
  const categoryByTaskId = new Map(
    tasks.map((task) => [
      task.id,
      isTaskCategory(task.category) ? task.category : "development",
    ])
  );
  let loggedSeconds = 0;
  let productionSeconds = 0;
  for (const row of timeResult.data ?? []) {
    if (!row.ended_at) {
      continue;
    }
    const start = new Date(row.started_at).getTime();
    const end = new Date(row.ended_at).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      continue;
    }
    const seconds = (end - start) / 1000;
    loggedSeconds += seconds;
    const category = categoryByTaskId.get(row.task_id);
    if (category && PRODUCTION_CATEGORIES.includes(category)) {
      productionSeconds += seconds;
    }
  }

  const kanbanTasks: KanbanTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: isTaskStatus(task.status) ? task.status : "todo",
    section: task.section,
    category: isTaskCategory(task.category) ? task.category : "development",
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

  const checklistItems: ChecklistItem[] = (checklistResult.data ?? []).map(
    (row) => ({
      id: row.id,
      label: row.label,
      checked: row.checked,
      isCustom: row.is_custom,
    })
  );

  const notes: ProjectNote[] = (notesResult.data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    stage: row.stage && isProjectStage(row.stage) ? row.stage : null,
    userId: row.user_id,
    createdAt: row.created_at,
  }));

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
            {project.customer_name ? (
              <span> · {project.customer_name}</span>
            ) : null}
          </>
        }
        actions={
          <ProjectStageControl
            slug={slug}
            projectId={project.id}
            stage={projectStage}
            canEdit={canEdit}
          />
        }
      />

      {projectStage === "completed" ? (
        <div className="flex items-center gap-3 rounded-xl bg-workspace-wash p-4 ring-1 ring-workspace-border/50">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-workspace-soft text-workspace-on-soft">
            <PartyPopper className="size-4" />
          </span>
          <p className="text-sm text-workspace-on-soft">
            <span className="font-semibold">Prosjektet er fullført.</span>{" "}
            Bra jobba — husk å be om kundeuttalelse hvis det ikke er gjort.
          </p>
        </div>
      ) : null}

      <ProjectTabs hrefBase={hrefBase} active={tab} />

      {tab === "oversikt" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
          <Surface className="p-5">
            <ProjectNotesPanel
              slug={slug}
              projectId={project.id}
              currentStage={projectStage}
              notes={notes}
              authorNameById={authorNameById}
              currentUserId={userId}
              canEdit={canEdit}
            />
          </Surface>
          <div className="flex flex-col gap-6">
            <Surface className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-label text-muted-foreground">
                  Produksjonstimer
                </p>
                <span className="flex size-8 items-center justify-center rounded-lg bg-workspace-wash text-workspace-accent">
                  <Timer className="size-4" />
                </span>
              </div>
              <p className="mt-3 font-heading text-display tabular-nums">
                {formatHours(productionSeconds / 3600)}
                {estimatedHours !== null ? (
                  <span className="text-base font-medium text-muted-foreground">
                    {" "}
                    av {formatHours(estimatedHours)} t
                  </span>
                ) : (
                  <span className="text-base font-medium text-muted-foreground">
                    {" "}
                    t
                  </span>
                )}
              </p>
              {estimatedHours !== null && estimatedHours > 0 ? (
                <>
                  <ProgressBar
                    value={(productionSeconds / 3600 / estimatedHours) * 100}
                    className="mt-3"
                  />
                  <p
                    className={
                      productionSeconds / 3600 > estimatedHours
                        ? "mt-2 text-label font-medium text-destructive"
                        : "mt-2 text-label text-muted-foreground"
                    }
                  >
                    {productionSeconds / 3600 > estimatedHours
                      ? `${formatHours(productionSeconds / 3600 - estimatedHours)} t over estimatet`
                      : `${formatHours(estimatedHours - productionSeconds / 3600)} t igjen av estimatet`}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-label text-muted-foreground">
                  Sett et timeestimat på Detaljer-fanen for å følge forbruket.
                </p>
              )}
              <p className="mt-3 border-t border-border pt-3 font-mono text-label text-muted-foreground">
                Totalt ført: {formatLoggedDuration(loggedSeconds)} (kun{" "}
                {TASK_CATEGORY_LABELS.design.toLowerCase()}/
                {TASK_CATEGORY_LABELS.development.toLowerCase()} teller mot
                estimatet)
              </p>
            </Surface>
            <Surface className="p-5">
              <ProjectChecklist
                slug={slug}
                projectId={project.id}
                items={checklistItems}
                canEdit={canEdit}
              />
            </Surface>
          </div>
        </div>
      ) : null}

      {tab === "oppgaver" ? (
        <div className="space-y-4">
          {canEdit ? (
            <Surface className="p-5">
              <form
                action={createTask}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
              >
                <input type="hidden" name="workspace_slug" value={slug} />
                <input type="hidden" name="project_id" value={project.id} />
                <div className="space-y-2 sm:col-span-2 lg:col-span-5">
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
                  <Label htmlFor="category">Kategori</Label>
                  <select
                    id="category"
                    name="category"
                    defaultValue="development"
                    className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    <option value="development">Utvikling</option>
                    <option value="design">Design</option>
                    <option value="other">Annet (teller ikke)</option>
                  </select>
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
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    className="h-10"
                  />
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
            customerName={project.customer_name}
            domain={project.domain}
            productionDomain={project.production_domain}
            contactName={project.contact_name}
            contactEmail={project.contact_email}
            oldWebsiteUrl={project.old_website_url}
            estimatedHours={estimatedHours}
            canEdit={canEdit}
            saved={saved === "1"}
            error={
              error === "invalid" || error === "email" || error === "hours"
                ? error
                : undefined
            }
          />
        </Surface>
      ) : null}
    </PageFrame>
  );
}

function formatHours(hours: number): string {
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(Math.max(0, hours));
}
