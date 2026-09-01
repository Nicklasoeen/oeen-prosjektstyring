import type { SupabaseClient } from "@supabase/supabase-js";

export type RunningTimer = {
  entryId: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  startedAt: string;
};

type TimeEntryRow = {
  id: string;
  task_id: string;
  workspace_id: string;
  started_at: string;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string;
};

type WorkspaceRow = {
  id: string;
  slug: string;
  name: string;
};

export async function findRunningTimer(
  supabase: SupabaseClient,
  userId: string
): Promise<RunningTimer | null> {
  const { data: entry, error } = await supabase
    .from("time_entries")
    .select("id, task_id, workspace_id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle<TimeEntryRow>();

  if (error || !entry) {
    return null;
  }

  const [{ data: task }, { data: workspace }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, project_id")
      .eq("id", entry.task_id)
      .eq("workspace_id", entry.workspace_id)
      .maybeSingle<TaskRow>(),
    supabase
      .from("workspaces")
      .select("id, slug, name")
      .eq("id", entry.workspace_id)
      .maybeSingle<WorkspaceRow>(),
  ]);

  if (!task || !workspace) {
    return null;
  }

  return {
    entryId: entry.id,
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.project_id,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    workspaceName: workspace.name,
    startedAt: entry.started_at,
  };
}

export type Profile = {
  name: string;
  email: string;
};

export async function findUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", userId)
    .maybeSingle<Profile>();
  return data ?? null;
}
