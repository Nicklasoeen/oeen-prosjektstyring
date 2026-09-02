import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

import { getWorkspaceAccess } from "@/lib/auth/require-workspace";
import { decryptSecret } from "@/lib/crypto-secret";
import { parseCustomFields } from "@/lib/project-types";

type ProjectRow = {
  id: string;
  name: string;
  stage: string;
  project_type_id: string | null;
  custom_fields: unknown;
};
type ProjectTypeRow = { id: string; name: string };
type TaskRow = {
  title: string;
  status: string;
  priority: string;
  progress: number;
  due_date: string | null;
  project_id: string;
};

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json()) as {
    messages?: UIMessage[];
    workspaceSlug?: string;
  };
  const workspaceSlug =
    body.workspaceSlug ?? url.searchParams.get("workspace") ?? "";
  const messages = body.messages ?? [];

  if (!workspaceSlug) {
    return NextResponse.json({ error: "Mangler workspace" }, { status: 400 });
  }

  const access = await getWorkspaceAccess(workspaceSlug);
  if (!access) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 401 });
  }
  const { userId, workspace, supabase } = access;

  const { data: credential } = await supabase
    .from("user_credentials")
    .select("encrypted_key")
    .eq("user_id", userId)
    .eq("provider", "anthropic")
    .maybeSingle<{ encrypted_key: string }>();

  if (!credential) {
    return NextResponse.json(
      { error: "Ingen Anthropic-nøkkel. Legg den inn under Innstillinger." },
      { status: 400 }
    );
  }

  const apiKey = decryptSecret(credential.encrypted_key);
  const anthropic = createAnthropic({ apiKey });

  const [projectsResult, tasksResult, projectTypesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, stage, project_type_id, custom_fields")
      .eq("workspace_id", workspace.id)
      .returns<ProjectRow[]>(),
    supabase
      .from("tasks")
      .select("title, status, priority, progress, due_date, project_id")
      .eq("workspace_id", workspace.id)
      .returns<TaskRow[]>(),
    supabase
      .from("project_types")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .returns<ProjectTypeRow[]>(),
  ]);

  const typeNameById = new Map(
    (projectTypesResult.data ?? []).map((row) => [row.id, row.name])
  );

  const snapshot = JSON.stringify(
    {
      workspace: workspace.name,
      projects: (projectsResult.data ?? []).map((project) => ({
        name: project.name,
        stage: project.stage,
        type: project.project_type_id
          ? typeNameById.get(project.project_type_id)
          : null,
        fields: parseCustomFields(project.custom_fields),
        tasks: (tasksResult.data ?? [])
          .filter((task) => task.project_id === project.id)
          .map((task) => ({
            title: task.title,
            status: task.status,
            priority: task.priority,
            progress: task.progress,
            due_date: task.due_date,
          })),
      })),
    },
    null,
    2
  );

  let threadId: string | null = null;
  const { data: existingThread } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingThread) {
    threadId = existingThread.id;
  } else {
    const { data: created, error: threadError } = await supabase
      .from("chat_threads")
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
      })
      .select("id")
      .maybeSingle<{ id: string }>();
    if (threadError || !created) {
      throw threadError ?? new Error("Kunne ikke opprette chat");
    }
    threadId = created.id;
  }

  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const lastUserText = lastUser
    ? lastUser.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
    : "";

  if (lastUserText && threadId) {
    await supabase.from("chat_messages").insert({
      thread_id: threadId,
      workspace_id: workspace.id,
      user_id: userId,
      role: "user",
      content: lastUserText,
    });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: [
      "Du er assistenten i Øen prosjektstyring.",
      "Svar på norsk.",
      "Du har kun lesetilgang til snapshotet under. Du kan ikke opprette, endre eller slette noe.",
      "Ikke påstå at du har gjort en endring.",
      "Workspace-data:",
      snapshot,
    ].join("\n\n"),
    messages: await convertToModelMessages(messages),
    async onFinish({ text, usage }) {
      if (!threadId) {
        return;
      }
      await supabase.from("chat_messages").insert({
        thread_id: threadId,
        workspace_id: workspace.id,
        user_id: userId,
        role: "assistant",
        content: text,
        input_tokens: usage.inputTokens ?? null,
        output_tokens: usage.outputTokens ?? null,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
