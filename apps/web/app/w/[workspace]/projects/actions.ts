"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { canEditWorkspace } from "@/lib/auth/workspace-access";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import {
  isProjectType,
  isTaskPriority,
  isTaskStatus,
} from "@/lib/projects";

function projectPath(slug: string, projectId: string, tab?: string) {
  const base = `/w/${slug}/projects/${projectId}`;
  return tab ? `${base}?tab=${tab}` : base;
}

function revalidateProject(slug: string, projectId: string) {
  revalidatePath(projectPath(slug, projectId));
  revalidatePath(`/w/${slug}/projects`);
  revalidatePath(`/w/${slug}/dashboard`);
}

export async function createProject(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const typeValue = String(formData.get("type") ?? "");
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects`
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  if (!name || !isProjectType(typeValue)) {
    redirect(`/w/${slug}/projects?error=invalid`);
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      name,
      type: typeValue,
      status: "active",
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke opprette prosjekt");
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

export async function updateProjectNotes(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const notes = String(formData.get("notes") ?? "");

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId)
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ notes })
    .eq("id", projectId)
    .eq("workspace_id", workspace.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw error ?? new Error("Kunne ikke lagre notater");
  }

  await logActivity(supabase, {
    workspaceId: workspace.id,
    userId,
    entityType: "project",
    entityId: data.id,
    action: "updated",
  });

  revalidateProject(slug, projectId);
}

export async function updateProjectDetails(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const typeValue = String(formData.get("type") ?? "");
  const domain = emptyToNull(formData.get("domain"));
  const productionDomain = emptyToNull(formData.get("production_domain"));
  const contactName = emptyToNull(formData.get("contact_name"));
  const contactEmail = emptyToNull(formData.get("contact_email"));

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId, "detaljer")
  );

  if (!canEditWorkspace(workspace.role)) {
    redirect("/unauthorized");
  }

  if (!isProjectType(typeValue)) {
    redirect(`${projectPath(slug, projectId, "detaljer")}&error=invalid`);
  }

  if (contactEmail && !contactEmail.includes("@")) {
    redirect(`${projectPath(slug, projectId, "detaljer")}&error=email`);
  }

  const { data, error } = await supabase
    .from("projects")
    .update({
      type: typeValue,
      domain,
      production_domain: productionDomain,
      contact_name: contactName,
      contact_email: contactEmail,
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

export async function toggleTaskTimer(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "");
  const intent = String(formData.get("intent") ?? "");

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    projectPath(slug, projectId, "oppgaver")
  );

  const { data: task } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!task || task.project_id !== projectId) {
    redirect("/unauthorized");
  }

  if (intent === "stop") {
    const { data: stopped, error } = await supabase
      .from("time_entries")
      .update({ ended_at: new Date().toISOString() })
      .eq("task_id", task.id)
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
  } else {
    const { data: stoppedOthers, error: stopError } = await supabase
      .from("time_entries")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("ended_at", null)
      .select("id, workspace_id")
      .returns<Array<{ id: string; workspace_id: string }>>();

    if (stopError) {
      throw stopError;
    }

    for (const row of stoppedOthers ?? []) {
      await logActivity(supabase, {
        workspaceId: row.workspace_id,
        userId,
        entityType: "time_entry",
        entityId: row.id,
        action: "timer.stopped",
      });
    }

    const { data: started, error: startError } = await supabase
      .from("time_entries")
      .insert({
        workspace_id: workspace.id,
        task_id: task.id,
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
  }

  revalidateProject(slug, projectId);
  revalidatePath(`/w/${slug}`, "layout");
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
    .select("id, workspace_id")
    .returns<Array<{ id: string; workspace_id: string }>>();

  if (error) {
    throw error;
  }

  for (const row of stopped ?? []) {
    await logActivity(supabase, {
      workspaceId: row.workspace_id,
      userId,
      entityType: "time_entry",
      entityId: row.id,
      action: "timer.stopped",
    });
  }

  revalidatePath(`/w/${slug}`, "layout");
  revalidatePath(`/w/${slug}/dashboard`);
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}
