"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import {
  canDeleteWorkspace,
  canEditWorkspace,
  listWorkspacesForUser,
} from "@/lib/auth/workspace-access";
import {
  encryptSecret,
  isAnthropicApiKey,
  keyLast4,
} from "@/lib/crypto-secret";
import {
  isWorkspaceAccent,
  normalizeWorkspaceAccent,
} from "@/lib/workspace-accent";

function revalidateWorkspace(slug: string) {
  revalidatePath(`/w/${slug}`, "layout");
  revalidatePath(`/w/${slug}/settings`);
  revalidatePath(`/w/${slug}/dashboard`);
}

export async function updateWorkspace(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const colorAccentRaw = String(formData.get("color_accent") ?? "");
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect(`/w/${slug}/settings?ws=forbidden`);
  }

  if (!name || !isWorkspaceAccent(colorAccentRaw)) {
    redirect(`/w/${slug}/settings?ws=invalid`);
  }

  const colorAccent = normalizeWorkspaceAccent(colorAccentRaw);
  const { error } = await supabase
    .from("workspaces")
    .update({
      name,
      color_accent: colorAccent,
    })
    .eq("id", workspace.id);

  if (error) {
    throw error;
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "workspace",
    entityId: workspace.id,
    action: "updated",
  });

  revalidateWorkspace(slug);
  redirect(`/w/${slug}/settings?ws=saved`);
}

export async function leaveWorkspace(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  if (workspace.role === "owner") {
    const { data: owners, error: ownersError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("role", "owner")
      .returns<Array<{ id: string }>>();

    if (ownersError) {
      throw ownersError;
    }

    if ((owners?.length ?? 0) <= 1) {
      redirect(`/w/${slug}/settings?leave=last_owner`);
    }
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "workspace",
    entityId: workspace.id,
    action: "left",
  });

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const remaining = await listWorkspacesForUser(supabase, userId);
  revalidatePath("/", "layout");
  redirect(
    remaining[0]
      ? `/w/${remaining[0].slug}/dashboard`
      : "/w/new"
  );
}

export async function deleteWorkspace(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const confirmName = String(formData.get("confirm_name") ?? "").trim();
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  if (!canDeleteWorkspace(workspace.role)) {
    redirect(`/w/${slug}/settings?delete=forbidden`);
  }

  if (confirmName !== workspace.name) {
    redirect(`/w/${slug}/settings?delete=confirm`);
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "workspace",
    entityId: workspace.id,
    action: "deleted",
  });

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspace.id);

  if (error) {
    throw error;
  }

  const remaining = await listWorkspacesForUser(supabase, userId);
  revalidatePath("/", "layout");
  redirect(
    remaining[0]
      ? `/w/${remaining[0].slug}/dashboard`
      : "/w/new"
  );
}

export async function saveAnthropicKey(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const key = String(formData.get("api_key") ?? "").trim();
  const { userId, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  if (!isAnthropicApiKey(key)) {
    redirect(`/w/${slug}/settings?error=invalid`);
  }

  const encrypted = encryptSecret(key);
  const last4 = keyLast4(key);

  const { data: existing } = await supabase
    .from("user_credentials")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "anthropic")
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await supabase
      .from("user_credentials")
      .update({
        encrypted_key: encrypted,
        key_last4: last4,
      })
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("user_credentials").insert({
      user_id: userId,
      provider: "anthropic",
      encrypted_key: encrypted,
      key_last4: last4,
    });

    if (error) {
      throw error;
    }
  }

  revalidatePath(`/w/${slug}/settings`);
  revalidatePath(`/w/${slug}/dashboard`);
  redirect(`/w/${slug}/settings?saved=1`);
}

export async function deleteAnthropicKey(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const { userId, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  const { error } = await supabase
    .from("user_credentials")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "anthropic");

  if (error) {
    throw error;
  }

  revalidatePath(`/w/${slug}/settings`);
  revalidatePath(`/w/${slug}/dashboard`);
  redirect(`/w/${slug}/settings`);
}
