import type { SupabaseClient } from "@supabase/supabase-js";

export type RunningTimer = {
  entryId: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  startedAt: string;
};

type TimeEntryRow = {
  id: string;
  project_id: string;
  workspace_id: string;
  started_at: string;
};

type ProjectRow = { id: string; name: string };

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
    .select("id, project_id, workspace_id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle<TimeEntryRow>();

  if (error || !entry) {
    return null;
  }

  const [{ data: project }, { data: workspace }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name")
      .eq("id", entry.project_id)
      .eq("workspace_id", entry.workspace_id)
      .maybeSingle<ProjectRow>(),
    supabase
      .from("workspaces")
      .select("id, slug, name")
      .eq("id", entry.workspace_id)
      .maybeSingle<WorkspaceRow>(),
  ]);

  if (!project || !workspace) {
    return null;
  }

  return {
    entryId: entry.id,
    projectId: project.id,
    projectName: project.name,
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
