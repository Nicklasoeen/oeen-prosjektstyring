"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import { canEditWorkspace } from "@/lib/auth/workspace-access";
import {
  DEFAULT_PROJECT_TYPES,
  parseChecklistTemplate,
  parseFieldSchema,
  type ProjectField,
} from "@/lib/project-types";

const SETTINGS_PATH = "prosjekttyper";

function typesPath(slug: string, status?: string) {
  const base = `/w/${slug}/settings/${SETTINGS_PATH}`;
  return status ? `${base}?status=${status}` : base;
}

function revalidateTypes(slug: string) {
  revalidatePath(typesPath(slug));
  revalidatePath(`/w/${slug}/projects`);
  revalidatePath(`/w/${slug}/dashboard`);
}

async function requireEditor(slug: string) {
  const access = await requireWorkspaceAccess(slug, typesPath(slug));
  if (!canEditWorkspace(access.workspace.role)) {
    redirect("/unauthorized");
  }
  return access;
}

/**
 * The editor submits the whole schema as JSON so field order, options and
 * checklist rows stay in sync with what the user sees.
 */
function readSchemaPayload(formData: FormData): {
  fields: ProjectField[];
  checklist: string[];
} | null {
  try {
    const fields = parseFieldSchema(
      JSON.parse(String(formData.get("field_schema") ?? "[]"))
    );
    const checklist = parseChecklistTemplate(
      JSON.parse(String(formData.get("checklist_template") ?? "[]"))
    );
    return { fields, checklist };
  } catch {
    return null;
  }
}

export async function createProjectType(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const { userId, workspace, supabase } = await requireEditor(slug);

  const payload = readSchemaPayload(formData);
  if (!name || !payload) {
    redirect(typesPath(slug, "invalid"));
  }

  const { data: lastType } = await supabase
    .from("project_types")
    .select("sort_order")
    .eq("workspace_id", workspace.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { data, error } = await supabase
    .from("project_types")
    .insert({
      workspace_id: workspace.id,
      name,
      field_schema: payload.fields,
      checklist_template: payload.checklist,
      sort_order: (lastType?.sort_order ?? -1) + 1,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      redirect(typesPath(slug, "duplicate"));
    }
    throw error;
  }
  if (!data) {
    throw new Error("Kunne ikke opprette prosjekttype");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project_type",
    entityId: data.id,
    action: "created",
  });

  revalidateTypes(slug);
  redirect(typesPath(slug, "created"));
}

export async function updateProjectType(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const typeId = String(formData.get("type_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const { userId, workspace, supabase } = await requireEditor(slug);

  const payload = readSchemaPayload(formData);
  if (!name || !payload) {
    redirect(typesPath(slug, "invalid"));
  }

  const { data, error } = await supabase
    .from("project_types")
    .update({
      name,
      field_schema: payload.fields,
      checklist_template: payload.checklist,
    })
    .eq("id", typeId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      redirect(typesPath(slug, "duplicate"));
    }
    throw error;
  }
  if (!data) {
    throw new Error("Kunne ikke lagre prosjekttypen");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project_type",
    entityId: data.id,
    action: "updated",
  });

  revalidateTypes(slug);
  redirect(typesPath(slug, "saved"));
}

export async function deleteProjectType(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const typeId = String(formData.get("type_id") ?? "");
  const { userId, workspace, supabase } = await requireEditor(slug);

  const { count, error: countError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("project_type_id", typeId);

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) > 0) {
    redirect(typesPath(slug, "in_use"));
  }

  const { error } = await supabase
    .from("project_types")
    .delete()
    .eq("id", typeId)
    .eq("workspace_id", workspace.id);

  if (error) {
    throw error;
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project_type",
    entityId: typeId,
    action: "deleted",
  });

  revalidateTypes(slug);
  redirect(typesPath(slug, "deleted"));
}

/** Bootstraps a workspace that has no types yet with the standard set. */
export async function seedDefaultProjectTypes(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const { userId, workspace, supabase } = await requireEditor(slug);

  const { data: existing, error: existingError } = await supabase
    .from("project_types")
    .select("name")
    .eq("workspace_id", workspace.id)
    .returns<Array<{ name: string }>>();

  if (existingError) {
    throw existingError;
  }

  const taken = new Set((existing ?? []).map((row) => row.name));
  const missing = DEFAULT_PROJECT_TYPES.filter(
    (type) => !taken.has(type.name)
  );

  if (missing.length === 0) {
    redirect(typesPath(slug));
  }

  const offset = existing?.length ?? 0;
  const { error } = await supabase.from("project_types").insert(
    missing.map((type, index) => ({
      workspace_id: workspace.id,
      name: type.name,
      field_schema: type.fields,
      checklist_template: type.checklist,
      sort_order: offset + index,
    }))
  );

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

  revalidateTypes(slug);
  redirect(typesPath(slug, "created"));
}
