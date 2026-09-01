import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceSummary = {
  id: string;
  slug: string;
  name: string;
  type: "student" | "enk" | "job";
  colorAccent: string | null;
  role: "owner" | "member" | "viewer";
};

type WorkspaceRow = {
  id: string;
  slug: string;
  name: string;
  type: WorkspaceSummary["type"];
  color_accent: string | null;
};

type MembershipRow = {
  id: string;
  role: WorkspaceSummary["role"];
  workspace_id: string;
};

export async function findMembershipForSlug(
  supabase: SupabaseClient,
  userId: string,
  slug: string
): Promise<WorkspaceSummary | null> {
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, name, type, color_accent")
    .eq("slug", slug)
    .maybeSingle<WorkspaceRow>();

  if (workspaceError || !workspace) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("id, role, workspace_id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .maybeSingle<MembershipRow>();

  if (membershipError || !membership) {
    return null;
  }

  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    type: workspace.type,
    colorAccent: workspace.color_accent,
    role: membership.role,
  };
}

export async function listWorkspacesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkspaceSummary[]> {
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("role, workspace_id")
    .eq("user_id", userId)
    .returns<Array<Pick<MembershipRow, "role" | "workspace_id">>>();

  if (error || !memberships?.length) {
    return [];
  }

  const workspaceIds = memberships.map((row) => row.workspace_id);
  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, name, type, color_accent")
    .in("id", workspaceIds)
    .returns<WorkspaceRow[]>();

  if (workspaceError || !workspaces) {
    return [];
  }

  const roleByWorkspaceId = new Map(
    memberships.map((row) => [row.workspace_id, row.role])
  );

  return workspaces.map((workspace) => ({
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    type: workspace.type,
    colorAccent: workspace.color_accent,
    role: roleByWorkspaceId.get(workspace.id) ?? "viewer",
  }));
}

export async function firstWorkspaceSlugForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const existing = await listWorkspacesForUser(supabase, userId);
  return existing[0]?.slug ?? null;
}
