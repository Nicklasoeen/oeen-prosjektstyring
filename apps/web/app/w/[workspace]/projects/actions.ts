"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";

const TASK_PRIORITIES = ["low", "medium", "urgent"] as const;

function isTaskPriority(
  value: string
): value is (typeof TASK_PRIORITIES)[number] {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

export async function createProject(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const { workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects`
  );

  if (!name) {
    redirect(`/w/${slug}/projects`);
  }

  const { error } = await supabase.from("projects").insert({
    workspace_id: workspace.id,
    name,
    status: "active",
  });

  if (error) {
    throw error;
  }

  revalidatePath(`/w/${slug}/projects`);
  redirect(`/w/${slug}/projects`);
}

export async function createTask(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const priorityValue = String(formData.get("priority") ?? "medium");
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();

  const { workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects/${projectId}`
  );

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
  const dueDate = dueDateRaw.length > 0 ? dueDateRaw : null;

  const { error } = await supabase.from("tasks").insert({
    workspace_id: workspace.id,
    project_id: project.id,
    title,
    priority,
    due_date: dueDate,
    status: "todo",
    progress: 0,
  });

  if (error) {
    throw error;
  }

  revalidatePath(`/w/${slug}/projects/${project.id}`);
  redirect(`/w/${slug}/projects/${project.id}`);
}

export async function toggleTaskTimer(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const taskId = String(formData.get("task_id") ?? "");
  const intent = String(formData.get("intent") ?? "");

  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/projects/${projectId}`
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
    const { error } = await supabase
      .from("time_entries")
      .update({ ended_at: new Date().toISOString() })
      .eq("task_id", task.id)
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .is("ended_at", null);

    if (error) {
      throw error;
    }
  } else {
    const { error: stopError } = await supabase
      .from("time_entries")
      .update({ ended_at: new Date().toISOString() })
      .eq("workspace_id", workspace.id)
      .eq("user_id", userId)
      .is("ended_at", null);

    if (stopError) {
      throw stopError;
    }

    const { error: startError } = await supabase.from("time_entries").insert({
      workspace_id: workspace.id,
      task_id: task.id,
      user_id: userId,
      started_at: new Date().toISOString(),
    });

    if (startError) {
      throw startError;
    }
  }

  revalidatePath(`/w/${slug}/projects/${task.project_id}`);
}
