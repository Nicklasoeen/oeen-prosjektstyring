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
import { ProjectTimer } from "@/components/project-timer";
import { Surface } from "@/components/surface";
import { TimerStoppedBanner } from "@/components/timer-stopped-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canEditWorkspace } from "@/lib/auth/workspace-access";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { formatHoursNb, formatLoggedDuration } from "@/lib/format";
import {
  isProjectStage,
  isTaskCategory,
  isTaskPriority,
  isTaskStatus,
  resolveProjectTab,
  type ProjectStage,
} from "@/lib/projects";
import { loggedSeconds } from "@/lib/production-hours";
import { requestClock } from "@/lib/request-clock";
import {
  customerLabel,
  parseChecklistTemplate,
  parseCustomFields,
  parseFieldSchema,
  type ProjectTypeSummary,
} from "@/lib/project-types";

type ProjectRow = {
  id: string;
  name: string;
  stage: string;
  project_type_id: string | null;
  custom_fields: unknown;
  estimated_hours: string | number | null;
};

type TypeRow = {
  id: string;
  name: string;
  field_schema: unknown;
  checklist_template: unknown;
  sort_order: number;
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
type TimeRow = { started_at: string; ended_at: string | null };
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
  searchParams: Promise<{
    tab?: string;
    saved?: string;
    error?: string;
    stopped?: string;
  }>;
}) {
  const { workspace: slug, projectId } = await params;
  const { tab: tabParam, saved, error, stopped } = await searchParams;
  const tab = resolveProjectTab(tabParam);
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects/${projectId}`
  );
  const canEdit = canEditWorkspace(workspace.role);

  const [{ data: project }, typesResult] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, stage, project_type_id, custom_fields, estimated_hours"
      )
      .eq("id", projectId)
      .eq("workspace_id", workspace.id)
      .maybeSingle<ProjectRow>(),
    supabase
      .from("project_types")
      .select("id, name, field_schema, checklist_template, sort_order")
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: true })
      .returns<TypeRow[]>(),
  ]);

  if (!project) {
    redirect(`/w/${slug}/projects`);
  }
  if (typesResult.error) {
    throw typesResult.error;
  }

  const projectTypes: ProjectTypeSummary[] = (typesResult.data ?? []).map(
    (row) => ({
      id: row.id,
      name: row.name,
      fields: parseFieldSchema(row.field_schema),
      checklist: parseChecklistTemplate(row.checklist_template),
      sortOrder: row.sort_order,
    })
  );
  const activeType = projectTypes.find(
    (type) => type.id === project.project_type_id
  );
  const customFields = parseCustomFields(project.custom_fields);
  const customer = customerLabel(customFields);
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
    timeResult,
    runningResult,
    checklistResult,
    notesResult,
    now,
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
    supabase
      .from("time_entries")
      .select("started_at, ended_at")
      .eq("project_id", project.id)
      .eq("workspace_id", workspace.id)
      .returns<TimeRow[]>(),
    supabase
      .from("time_entries")
      .select("id")
      .eq("project_id", project.id)
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .is("ended_at", null)
      .maybeSingle<{ id: string }>(),
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
    requestClock(),
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

  const logged = loggedSeconds(timeResult.data ?? [], now.getTime());
  const timerRunning = Boolean(runningResult.data);

  const kanbanTasks: KanbanTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: isTaskStatus(task.status) ? task.status : "todo",
    section: task.section,
    category: isTaskCategory(task.category) ? task.category : "development",
    priority: isTaskPriority(task.priority) ? task.priority : "medium",
    due_date: task.due_date,
    assigneeIds: assigneeIdsByTask.get(task.id) ?? [],
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
            <span> · {activeType?.name ?? "Uten type"}</span>
            {customer ? <span> · {customer}</span> : null}
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

      {stopped ? (
        <TimerStoppedBanner
          projectName={stopped}
          href={`${hrefBase}${tab === "oversikt" ? "" : `?tab=${tab}`}`}
        />
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
                <p className="text-label text-muted-foreground">Førte timer</p>
                <span className="flex size-8 items-center justify-center rounded-lg bg-workspace-wash text-workspace-accent">
                  <Timer className="size-4" />
                </span>
              </div>
              <p className="mt-3 font-heading text-display tabular-nums">
                {formatLoggedDuration(logged)}
                {estimatedHours !== null ? (
                  <span className="text-base font-medium text-muted-foreground">
                    {" "}
                    av {formatHoursNb(estimatedHours)} t
                  </span>
                ) : null}
              </p>
              {estimatedHours !== null && estimatedHours > 0 ? (
                <>
                  <ProgressBar
                    value={(logged / 3600 / estimatedHours) * 100}
                    className="mt-3"
                  />
                  <p
                    className={
                      logged / 3600 > estimatedHours
                        ? "mt-2 text-label font-medium text-destructive"
                        : "mt-2 text-label text-muted-foreground"
                    }
                  >
                    {logged / 3600 > estimatedHours
                      ? `${formatLoggedDuration(logged - estimatedHours * 3600)} over estimatet`
                      : `${formatLoggedDuration(estimatedHours * 3600 - logged)} igjen av estimatet`}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-label text-muted-foreground">
                  Sett et timeestimat på Detaljer-fanen for å følge forbruket.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                <ProjectTimer
                  slug={slug}
                  projectId={project.id}
                  running={timerRunning}
                  canEdit={canEdit}
                />
              </div>
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
            name={project.name}
            types={projectTypes}
            currentTypeId={project.project_type_id}
            values={customFields}
            estimatedHours={estimatedHours}
            canEdit={canEdit}
            saved={saved === "1"}
            error={
              error === "invalid" || error === "fields" || error === "hours"
                ? error
                : undefined
            }
          />
        </Surface>
      ) : null}
    </PageFrame>
  );
}
