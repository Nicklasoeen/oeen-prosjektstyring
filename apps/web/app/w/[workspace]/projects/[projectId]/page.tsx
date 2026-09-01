import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createTask,
  toggleTaskTimer,
} from "@/app/w/[workspace]/projects/actions";
import { EmptyState } from "@/components/empty-state";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ProgressBar } from "@/components/progress-bar";
import { PriorityBadge, TaskStatusBadge } from "@/components/status-badge";
import { Surface } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { formatDueDateNb, isPastDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: string;
  name: string;
  status: "active" | "archived";
};

type TaskRow = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "urgent";
  progress: number;
  due_date: string | null;
};

type TimeEntryRow = {
  id: string;
  task_id: string;
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; projectId: string }>;
}) {
  const { workspace: slug, projectId } = await params;
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects/${projectId}`
  );

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<ProjectRow>();

  if (!project) {
    redirect(`/w/${slug}/projects`);
  }

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, status, priority, progress, due_date")
    .eq("project_id", project.id)
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (taskError) {
    throw taskError;
  }

  const tasks = taskRows ?? [];
  const taskIds = tasks.map((task) => task.id);

  let runningByTaskId = new Set<string>();
  if (taskIds.length > 0) {
    const { data: running } = await supabase
      .from("time_entries")
      .select("id, task_id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .in("task_id", taskIds)
      .is("ended_at", null)
      .returns<TimeEntryRow[]>();

    runningByTaskId = new Set((running ?? []).map((entry) => entry.task_id));
  }

  return (
    <PageFrame>
      <PageHeader
        title={project.name}
        description={
          <Link
            href={`/w/${slug}/projects`}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Tilbake til prosjekter
          </Link>
        }
      />

      <Surface className="p-5">
        <form
          action={createTask}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="workspace_slug" value={slug} />
          <input type="hidden" name="project_id" value={project.id} />
          <div className="space-y-2 sm:col-span-2">
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
          <div className="sm:col-span-2">
            <Button type="submit">
              Opprett oppgave
            </Button>
          </div>
        </form>
      </Surface>

      {tasks.length === 0 ? (
        <EmptyState
          title="Ingen oppgaver ennå"
          description="Legg til den første oppgaven over. Prioritet, frist og fremdrift vises her når den er opprettet."
        />
      ) : (
        <ul className="grid gap-3">
          {tasks.map((task) => {
            const running = runningByTaskId.has(task.id);
            const overdue =
              task.due_date !== null &&
              task.status !== "done" &&
              isPastDate(task.due_date);

            return (
              <li key={task.id}>
                <Surface className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-section text-foreground">
                      {task.title}
                    </h2>
                    <PriorityBadge value={task.priority} />
                    <TaskStatusBadge value={task.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {task.due_date ? (
                      <p
                        className={cn(
                          "font-mono text-label",
                          overdue
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        Frist {formatDueDateNb(task.due_date)}
                      </p>
                    ) : (
                      <p className="font-mono text-label text-muted-foreground">
                        Ingen frist
                      </p>
                    )}
                  </div>
                  <ProgressBar value={task.progress} className="max-w-sm" />
                </div>
                <form action={toggleTaskTimer} className="shrink-0">
                  <input type="hidden" name="workspace_slug" value={slug} />
                  <input type="hidden" name="project_id" value={project.id} />
                  <input type="hidden" name="task_id" value={task.id} />
                  <input
                    type="hidden"
                    name="intent"
                    value={running ? "stop" : "start"}
                  />
                  <Button
                    type="submit"
                    variant={running ? "destructive" : "outline"}
                  >
                    {running ? "Stopp" : "Start"}
                  </Button>
                </form>
                </Surface>
              </li>
            );
          })}
        </ul>
      )}
    </PageFrame>
  );
}
