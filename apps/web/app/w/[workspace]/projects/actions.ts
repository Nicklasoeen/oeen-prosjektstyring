"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readCustomFieldValue } from "@/components/dynamic-project-fields";
import { logActivity } from "@/lib/activity";
import { canEditWorkspace } from "@/lib/auth/workspace-access";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import {
  collectCustomFields,
  parseChecklistTemplate,
  parseFieldSchema,
} from "@/lib/project-types";
import {
  isProjectStage,
  isTaskCategory,
  isTaskPriority,
  isTaskStatus,
} from "@/lib/projects";
import type { SupabaseClient } from "@supabase/supabase-js";

type ProjectTypeRow = {
  id: string;
  field_schema: unknown;
  checklist_template: unknown;
};

async function loadProjectType(
  supabase: SupabaseClient,
  workspaceId: string,
  typeId: string
): Promise<ProjectTypeRow | null> {
  const { data } = await supabase
    .from("project_types")
    .select("id, field_schema, checklist_template")
    .eq("id", typeId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<ProjectTypeRow>();
  return data ?? null;
}

function projectPath(slug: string, projectId: string, tab?: string) {
  const base = `/w/${slug}/projects/${projectId}`;
  return tab ? `${base}?tab=${tab}` : base;
}

function revalidateProject(slug: string, projectId: string) {
  revalidatePath(projectPath(slug, projectId));
  revalidatePath(`/w/${slug}/projects`);
  revalidatePath(`/w/${slug}/dashboard`);
  revalidatePath(`/w/${slug}/timeoversikt`);
}

function revalidateWorkspaceTimer(slug: string) {
  revalidatePath(`/w/${slug}`, "layout");
  revalidatePath(`/w/${slug}/dashboard`);
  revalidatePath(`/w/${slug}/timeoversikt`);
}

export async function createProject(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const typeId = String(formData.get("project_type_id") ?? "").trim();
  const estimatedHoursRaw = String(formData.get("estimated_hours") ?? "").trim();

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects`
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  if (!name || !typeId) {
    redirect(`/w/${slug}/projects?error=invalid`);
  }

  const projectType = await loadProjectType(supabase, workspace.id, typeId);
  if (!projectType) {
    redirect(`/w/${slug}/projects?error=invalid`);
  }

  const collected = collectCustomFields(
    parseFieldSchema(projectType.field_schema),
    (key) => readCustomFieldValue(formData, key)
  );
  if ("error" in collected) {
    redirect(`/w/${slug}/projects?error=fields`);
  }

  const estimatedHours = parseHours(estimatedHoursRaw);
  if (estimatedHours === undefined) {
    redirect(`/w/${slug}/projects?error=hours`);
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      name,
      project_type_id: projectType.id,
      custom_fields: collected.values,
      estimated_hours: estimatedHours,
      stage: "new",
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke opprette prosjekt");
  }

  const checklist = parseChecklistTemplate(projectType.checklist_template);
  if (checklist.length > 0) {
    const { error: checklistError } = await supabase
      .from("project_checklist_items")
      .insert(
        checklist.map((label) => ({
          workspace_id: workspace.id,
          project_id: data.id,
          label,
          checked: false,
          is_custom: false,
        }))
      );

    if (checklistError) {
      throw checklistError;
    }
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project",
    entityId: data.id,
    action: "created",
  });

  revalidateProject(slug, data.id);
  redirect(projectPath(slug, data.id));
}

export async function createTask(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const priorityValue = String(formData.get("priority") ?? "medium");
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();
  const sectionRaw = String(formData.get("section") ?? "").trim();
  const statusValue = String(formData.get("status") ?? "todo");
  const categoryValue = String(formData.get("category") ?? "development");

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId, "oppgaver")
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!project || !title) {
    redirect(`/w/${slug}/projects`);
  }

  const priority = isTaskPriority(priorityValue) ? priorityValue : "medium";
  const status = isTaskStatus(statusValue) ? statusValue : "todo";
  const category = isTaskCategory(categoryValue) ? categoryValue : "development";
  const dueDate = dueDateRaw.length > 0 ? dueDateRaw : null;
  const section = sectionRaw.length > 0 ? sectionRaw : null;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspace.id,
      project_id: project.id,
      title,
      priority,
      due_date: dueDate,
      status,
      section,
      category,
      progress: 0,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke opprette oppgave");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "task",
    entityId: data.id,
    action: "created",
  });

  revalidateProject(slug, project.id);
  redirect(projectPath(slug, project.id, "oppgaver"));
}

export async function updateProjectStage(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const stageValue = String(formData.get("stage") ?? "");

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId)
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  if (!isProjectStage(stageValue)) {
    redirect(projectPath(slug, projectId));
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ stage: stageValue })
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke endre fase");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project",
    entityId: data.id,
    action: "stage.changed",
  });

  revalidateProject(slug, projectId);
}

export async function toggleChecklistItem(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const nextChecked = String(formData.get("checked") ?? "") === "1";

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId)
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  const { data, error } = await supabase
    .from("project_checklist_items")
    .update({ checked: nextChecked })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke oppdatere sjekklisten");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "checklist_item",
    entityId: data.id,
    action: "updated",
  });

  revalidateProject(slug, projectId);
}

export async function addChecklistItem(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId)
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<{ id: string }>();

  if (!project || !label) {
    redirect(projectPath(slug, projectId));
  }

  const { data, error } = await supabase
    .from("project_checklist_items")
    .insert({
      workspace_id: workspace.id,
      project_id: project.id,
      label,
      checked: false,
      is_custom: true,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke legge til sjekkpunkt");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "checklist_item",
    entityId: data.id,
    action: "created",
  });

  revalidateProject(slug, projectId);
}

export async function addProjectNote(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const stageValue = String(formData.get("stage") ?? "").trim();

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId)
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<{ id: string }>();

  if (!project || !body) {
    redirect(projectPath(slug, projectId));
  }

  const stage = isProjectStage(stageValue) ? stageValue : null;

  const { data, error } = await supabase
    .from("project_notes")
    .insert({
      workspace_id: workspace.id,
      project_id: project.id,
      user_id: userId,
      body,
      stage,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke lagre notatet");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project_note",
    entityId: data.id,
    action: "created",
  });

  revalidateProject(slug, projectId);
}

export async function updateProjectNoteStage(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const noteId = String(formData.get("note_id") ?? "");
  const stageValue = String(formData.get("stage") ?? "").trim();

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId)
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  const stage = isProjectStage(stageValue) ? stageValue : null;

  const { data, error } = await supabase
    .from("project_notes")
    .update({ stage })
    .eq("id", noteId)
    .eq("project_id", projectId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke flytte notatet");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project_note",
    entityId: data.id,
    action: "updated",
  });

  revalidateProject(slug, projectId);
}

export async function updateTaskCategory(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "");
  const categoryValue = String(formData.get("category") ?? "");

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId, "oppgaver")
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  if (!isTaskCategory(categoryValue)) {
    redirect(projectPath(slug, projectId, "oppgaver"));
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ category: categoryValue })
    .eq("id", taskId)
    .eq("project_id", projectId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !task) {
    throw error ?? new Error("Kunne ikke endre kategori");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "task",
    entityId: task.id,
    action: "updated",
  });

  revalidateProject(slug, projectId);
}

export async function updateProjectDetails(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const typeId = String(formData.get("project_type_id") ?? "").trim();
  const estimatedHoursRaw = String(formData.get("estimated_hours") ?? "").trim();

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId, "detaljer")
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  if (!name || !typeId) {
    redirect(`${projectPath(slug, projectId, "detaljer")}&error=invalid`);
  }

  const projectType = await loadProjectType(supabase, workspace.id, typeId);
  if (!projectType) {
    redirect(`${projectPath(slug, projectId, "detaljer")}&error=invalid`);
  }

  const collected = collectCustomFields(
    parseFieldSchema(projectType.field_schema),
    (key) => readCustomFieldValue(formData, key)
  );
  if ("error" in collected) {
    redirect(`${projectPath(slug, projectId, "detaljer")}&error=fields`);
  }

  const estimatedHours = parseHours(estimatedHoursRaw);
  if (estimatedHours === undefined) {
    redirect(`${projectPath(slug, projectId, "detaljer")}&error=hours`);
  }

  const { data, error } = await supabase
    .from("projects")
    .update({
      name,
      project_type_id: projectType.id,
      custom_fields: collected.values,
      estimated_hours: estimatedHours,
    })
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke lagre detaljer");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project",
    entityId: data.id,
    action: "updated",
  });

  revalidateProject(slug, projectId);
  redirect(`${projectPath(slug, projectId, "detaljer")}&saved=1`);
}

export async function updateTaskBoard(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "");
  const statusValue = String(formData.get("status") ?? "");
  const sectionRaw = String(formData.get("section") ?? "");
  const clearSection = String(formData.get("clear_section") ?? "") === "1";

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId, "oppgaver")
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  if (!isTaskStatus(statusValue)) {
    redirect(projectPath(slug, projectId, "oppgaver"));
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<{ id: string; project_id: string }>();

  if (!task || task.project_id !== projectId) {
    redirect("/unauthorized");
  }

  const section = clearSection
    ? null
    : sectionRaw.trim().length > 0
      ? sectionRaw.trim()
      : undefined;

  const patch: {
    status: typeof statusValue;
    section?: string | null;
  } = { status: statusValue };
  if (section !== undefined) {
    patch.section = section;
  }

  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", task.id)
    .eq("workspace_id", workspace.id);

  if (error) {
    throw error;
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "task",
    entityId: task.id,
    action: "updated",
  });

  revalidateProject(slug, projectId);
}

export async function toggleTaskAssignee(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "");
  const memberId = String(formData.get("user_id") ?? "");

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId, "oppgaver")
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<{ id: string; project_id: string }>();

  if (!task || task.project_id !== projectId) {
    redirect("/unauthorized");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", memberId)
    .maybeSingle<{ user_id: string }>();

  if (!membership) {
    redirect("/unauthorized");
  }

  const { data: existing } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("task_id", task.id)
    .eq("user_id", memberId)
    .maybeSingle<{ task_id: string }>();

  if (existing) {
    const { error } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", task.id)
      .eq("user_id", memberId)
      .eq("workspace_id", workspace.id);
    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("task_assignees").insert({
      task_id: task.id,
      workspace_id: workspace.id,
      user_id: memberId,
    });
    if (error) {
      throw error;
    }
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "task",
    entityId: task.id,
    action: "updated",
  });

  revalidateProject(slug, projectId);
}

export async function toggleProjectTimer(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const intent = String(formData.get("intent") ?? "");

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId)
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .maybeSingle<{ id: string }>();

  if (!project) {
    redirect("/unauthorized");
  }

  if (intent === "stop") {
    const { data: stopped, error } = await supabase
      .from("time_entries")
      .update({ ended_at: new Date().toISOString() })
      .eq("project_id", project.id)
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .is("ended_at", null)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) {
      throw error;
    }

    if (stopped) {
      await logActivity(supabase, {
        workspaceId: workspace.id,
        userId,
        entityType: "time_entry",
        entityId: stopped.id,
        action: "timer.stopped",
      });
    }

    revalidateProject(slug, projectId);
    revalidateWorkspaceTimer(slug);
    redirect(projectPath(slug, projectId));
  }

  const { data: openEntries, error: openError } = await supabase
    .from("time_entries")
    .select("id, project_id, workspace_id")
    .eq("user_id", userId)
    .is("ended_at", null)
    .returns<Array<{ id: string; project_id: string; workspace_id: string }>>();

  if (openError) {
    throw openError;
  }

  const alreadyHere = (openEntries ?? []).find(
    (row) => row.project_id === project.id && row.workspace_id === workspace.id
  );
  if (alreadyHere) {
    revalidateProject(slug, projectId);
    revalidateWorkspaceTimer(slug);
    redirect(projectPath(slug, projectId));
  }

  let stoppedName: string | null = null;
  if ((openEntries ?? []).length > 0) {
    const endedAt = new Date().toISOString();
    for (const row of openEntries ?? []) {
      const { error: stopError } = await supabase
        .from("time_entries")
        .update({ ended_at: endedAt })
        .eq("id", row.id)
        .eq("user_id", userId)
        .is("ended_at", null);

      if (stopError) {
        throw stopError;
      }

      await logActivity(supabase, {
        workspaceId: row.workspace_id,
        userId,
        entityType: "time_entry",
        entityId: row.id,
        action: "timer.stopped",
      });
    }

    const stopped = openEntries?.[0];
    if (stopped) {
      const { data: stoppedProject } = await supabase
        .from("projects")
        .select("name")
        .eq("id", stopped.project_id)
        .maybeSingle<{ name: string }>();
      stoppedName = stoppedProject?.name ?? null;
    }

    const stoppedWorkspaceIds = [
      ...new Set((openEntries ?? []).map((row) => row.workspace_id)),
    ];
    const { data: stoppedWorkspaces } = await supabase
      .from("workspaces")
      .select("id, slug")
      .in("id", stoppedWorkspaceIds)
      .returns<Array<{ id: string; slug: string }>>();
    const slugById = new Map(
      (stoppedWorkspaces ?? []).map((row) => [row.id, row.slug])
    );
    for (const row of openEntries ?? []) {
      const rowSlug = slugById.get(row.workspace_id);
      if (rowSlug) {
        revalidateProject(rowSlug, row.project_id);
        revalidateWorkspaceTimer(rowSlug);
      }
    }
  }

  const { data: started, error: startError } = await supabase
    .from("time_entries")
    .insert({
      workspace_id: workspace.id,
      project_id: project.id,
      task_id: null,
      user_id: userId,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (startError || !started) {
    throw startError ?? new Error("Kunne ikke starte timer");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "time_entry",
    entityId: started.id,
    action: "timer.started",
  });

  revalidateProject(slug, projectId);
  revalidateWorkspaceTimer(slug);

  const next = projectPath(slug, projectId);
  if (stoppedName) {
    redirect(`${next}?stopped=${encodeURIComponent(stoppedName)}`);
  }
  redirect(next);
}

export async function stopRunningTimer(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const { userId, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/dashboard`
  );

  const { data: stopped, error } = await supabase
    .from("time_entries")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("ended_at", null)
    .select("id, workspace_id, project_id")
    .returns<Array<{ id: string; workspace_id: string; project_id: string }>>();

  if (error) {
    throw error;
  }

  const workspaceIds = [
    ...new Set((stopped ?? []).map((row) => row.workspace_id)),
  ];
  const { data: workspaceRows } =
    workspaceIds.length > 0
      ? await supabase
          .from("workspaces")
          .select("id, slug")
          .in("id", workspaceIds)
          .returns<Array<{ id: string; slug: string }>>()
      : { data: [] as Array<{ id: string; slug: string }> };
  const slugByWorkspaceId = new Map(
    (workspaceRows ?? []).map((row) => [row.id, row.slug])
  );

  for (const row of stopped ?? []) {
    await logActivity(supabase, {
      workspaceId: row.workspace_id,
      userId,
      entityType: "time_entry",
      entityId: row.id,
      action: "timer.stopped",
    });
    const rowSlug = slugByWorkspaceId.get(row.workspace_id) ?? slug;
    revalidateProject(rowSlug, row.project_id);
    revalidateWorkspaceTimer(rowSlug);
  }

  revalidateWorkspaceTimer(slug);
}

/** Returns null for empty input, undefined for invalid input. */
function parseHours(raw: string): number | null | undefined {
  if (raw.length === 0) {
    return null;
  }
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10000) {
    return undefined;
  }
  return Math.round(parsed * 100) / 100;
}
