import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createTask,
  toggleTaskTimer,
} from "@/app/w/[workspace]/projects/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";

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

const PRIORITY_LABEL: Record<TaskRow["priority"], string> = {
  low: "Lav",
  medium: "Middels",
  urgent: "Haster",
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/w/${slug}/projects`} className="underline-offset-4 hover:underline">
            Prosjekter
          </Link>
        </p>
        <h1 className="mt-1 text-xl font-medium tracking-tight">{project.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ny oppgave</CardTitle>
          <CardDescription>Knyttes til dette prosjektet.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTask} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="workspace_slug" value={slug} />
            <input type="hidden" name="project_id" value={project.id} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Tittel</Label>
              <Input id="title" name="title" required placeholder="F.eks. Skrive tilbud" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioritet</Label>
              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="low">Lav</option>
                <option value="medium">Middels</option>
                <option value="urgent">Haster</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Frist</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Opprett oppgave</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen oppgaver ennå.</p>
      ) : (
        <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
          {tasks.map((task) => {
            const running = runningByTaskId.has(task.id);
            return (
              <li
                key={task.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {PRIORITY_LABEL[task.priority]}
                    {task.due_date ? ` · frist ${task.due_date}` : ""}
                  </p>
                </div>
                <form action={toggleTaskTimer}>
                  <input type="hidden" name="workspace_slug" value={slug} />
                  <input type="hidden" name="project_id" value={project.id} />
                  <input type="hidden" name="task_id" value={task.id} />
                  <input
                    type="hidden"
                    name="intent"
                    value={running ? "stop" : "start"}
                  />
                  <Button type="submit" variant={running ? "destructive" : "outline"}>
                    {running ? "Stopp" : "Start"}
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
