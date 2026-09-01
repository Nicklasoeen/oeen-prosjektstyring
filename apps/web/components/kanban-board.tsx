"use client";

import {
  CheckCircle2,
  Circle,
  CircleDot,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  useMemo,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";

import {
  toggleTaskAssignee,
  toggleTaskTimer,
  updateTaskBoard,
  updateTaskCategory,
} from "@/app/w/[workspace]/projects/actions";
import { PriorityBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatDueDateNb, isPastDate } from "@/lib/format";
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/projects";
import { cn } from "@/lib/utils";

export type KanbanMember = {
  id: string;
  name: string;
  email: string;
};

export type KanbanTask = {
  id: string;
  title: string;
  status: TaskStatus;
  section: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  due_date: string | null;
  assigneeIds: string[];
  running: boolean;
};

const CATEGORY_DOTS: Record<TaskCategory, string> = {
  design: "bg-[#8E5BA6]",
  development: "bg-[#3E6C9E]",
  other: "bg-muted-foreground/50",
};

const COLUMN_ICONS: Record<TaskStatus, ReactNode> = {
  todo: <Circle className="size-4" />,
  in_progress: <CircleDot className="size-4 text-workspace-accent" />,
  in_review: <Sparkles className="size-4 text-workspace-accent" />,
  done: <CheckCircle2 className="size-4" />,
};

const ASSIGNEE_TONES = [
  "bg-[#E4EEF6] text-[#2C4A6E]",
  "bg-[#E7F0EA] text-[#2F6F62]",
  "bg-[#F8EBD8] text-[#8A5420]",
  "bg-[#EBE0EE] text-[#3F2C44]",
] as const;

export function KanbanBoard({
  slug,
  projectId,
  tasks,
  members,
  canEdit,
}: {
  slug: string;
  projectId: string;
  tasks: KanbanTask[];
  members: KanbanMember[];
  canEdit: boolean;
}) {
  const [extraSections, setExtraSections] = useState<Record<TaskStatus, string[]>>(
    {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    }
  );
  const [, startTransition] = useTransition();
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );

  function moveTask(
    taskId: string,
    status: TaskStatus,
    section: string | null | undefined
  ) {
    if (!canEdit) {
      return;
    }
    const formData = new FormData();
    formData.set("workspace_slug", slug);
    formData.set("project_id", projectId);
    formData.set("task_id", taskId);
    formData.set("status", status);
    if (section === null) {
      formData.set("clear_section", "1");
    } else if (typeof section === "string") {
      formData.set("section", section);
    }
    startTransition(() => {
      void updateTaskBoard(formData);
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        const sections = uniqueSections([
          ...columnTasks.map((task) => task.section),
          ...extraSections[status],
        ]);
        return (
          <section
            key={status}
            className="flex w-[18.5rem] shrink-0 flex-col rounded-xl bg-muted/60 p-3"
            onDragOver={allowDrop}
            onDrop={(event) => {
              const payload = readDrag(event);
              if (!payload) {
                return;
              }
              moveTask(payload.taskId, status, undefined);
            }}
          >
            <header className="mb-3 flex items-center gap-2 px-1">
              {COLUMN_ICONS[status]}
              <h2 className="font-heading text-sm font-semibold">
                {TASK_STATUS_LABELS[status]}
              </h2>
              <span className="ml-auto font-mono text-label text-muted-foreground">
                {columnTasks.length}
              </span>
            </header>

            <div className="flex flex-col gap-3">
              {sections.map((section) => (
                <SectionGroup
                  key={section}
                  title={section}
                  onDropTask={(taskId) => {
                    moveTask(taskId, status, section);
                  }}
                >
                  {columnTasks
                    .filter((task) => task.section === section)
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        slug={slug}
                        projectId={projectId}
                        task={task}
                        members={members}
                        memberById={memberById}
                        canEdit={canEdit}
                      />
                    ))}
                </SectionGroup>
              ))}

              <SectionGroup
                title="Uten seksjon"
                muted
                onDropTask={(taskId) => {
                  moveTask(taskId, status, null);
                }}
              >
                {columnTasks
                  .filter((task) => task.section === null)
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      slug={slug}
                      projectId={projectId}
                      task={task}
                      members={members}
                      memberById={memberById}
                      canEdit={canEdit}
                    />
                  ))}
              </SectionGroup>
            </div>

            {canEdit ? (
              <AddSection
                onAdd={(name) => {
                  setExtraSections((current) => ({
                    ...current,
                    [status]: current[status].includes(name)
                      ? current[status]
                      : [...current[status], name],
                  }));
                }}
              />
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function SectionGroup({
  title,
  muted,
  onDropTask,
  children,
}: {
  title: string;
  muted?: boolean;
  onDropTask: (taskId: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      className="space-y-2"
      onDragOver={allowDrop}
      onDrop={(event) => {
        event.stopPropagation();
        const payload = readDrag(event);
        if (payload) {
          onDropTask(payload.taskId);
        }
      }}
    >
      <p
        className={cn(
          "rounded-lg px-2 py-1 text-label font-medium",
          muted ? "text-muted-foreground" : "bg-card/80 text-foreground"
        )}
      >
        {title}
      </p>
      <ul className="flex min-h-8 flex-col gap-2">{children}</ul>
    </div>
  );
}

function TaskCard({
  slug,
  projectId,
  task,
  members,
  memberById,
  canEdit,
}: {
  slug: string;
  projectId: string;
  task: KanbanTask;
  members: KanbanMember[];
  memberById: Map<string, KanbanMember>;
  canEdit: boolean;
}) {
  const overdue =
    task.due_date !== null && task.status !== "done" && isPastDate(task.due_date);
  const assignees = task.assigneeIds
    .map((id) => memberById.get(id))
    .filter((member): member is KanbanMember => Boolean(member));

  return (
    <li
      draggable={canEdit}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          "application/json",
          JSON.stringify({ taskId: task.id })
        );
        event.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded-xl border border-black/[0.04] bg-card p-3 shadow-[0_4px_18px_rgba(26,35,48,0.05)] active:cursor-grabbing"
    >
      <p className="font-heading text-sm font-semibold">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge value={task.priority} />
        <CategoryTag
          slug={slug}
          projectId={projectId}
          task={task}
          canEdit={canEdit}
        />
        {task.due_date ? (
          <span
            className={cn(
              "font-mono text-label",
              overdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {formatDueDateNb(task.due_date)}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {assignees.length === 0 ? (
          <span className="text-label text-muted-foreground">Ingen tildelt</span>
        ) : (
          assignees.map((member) => (
            <span
              key={member.id}
              className={cn(
                "inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-label font-medium",
                assigneeTone(member.id)
              )}
            >
              {member.name}
            </span>
          ))
        )}
      </div>
      {canEdit ? (
        <div className="mt-3 flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Tildel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Medlemmer</DropdownMenuLabel>
              {members.map((member) => {
                const assigned = task.assigneeIds.includes(member.id);
                return (
                  <DropdownMenuItem
                    key={member.id}
                    onSelect={() => {
                      const formData = new FormData();
                      formData.set("workspace_slug", slug);
                      formData.set("project_id", projectId);
                      formData.set("task_id", task.id);
                      formData.set("user_id", member.id);
                      void toggleTaskAssignee(formData);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{member.name}</span>
                    {assigned ? (
                      <span className="text-label text-muted-foreground">valgt</span>
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <form action={toggleTaskTimer}>
            <input type="hidden" name="workspace_slug" value={slug} />
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="task_id" value={task.id} />
            <input
              type="hidden"
              name="intent"
              value={task.running ? "stop" : "start"}
            />
            <Button
              type="submit"
              variant={task.running ? "destructive" : "ghost"}
              size="sm"
            >
              {task.running ? "Stopp" : "Start"}
            </Button>
          </form>
        </div>
      ) : null}
    </li>
  );
}

function CategoryTag({
  slug,
  projectId,
  task,
  canEdit,
}: {
  slug: string;
  projectId: string;
  task: KanbanTask;
  canEdit: boolean;
}) {
  const tag = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-label font-medium text-muted-foreground">
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", CATEGORY_DOTS[task.category])}
      />
      {TASK_CATEGORY_LABELS[task.category]}
    </span>
  );

  if (!canEdit) {
    return tag;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Endre kategori"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {tag}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Kategori</DropdownMenuLabel>
        {TASK_CATEGORIES.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => {
              if (option === task.category) {
                return;
              }
              const formData = new FormData();
              formData.set("workspace_slug", slug);
              formData.set("project_id", projectId);
              formData.set("task_id", task.id);
              formData.set("category", option);
              void updateTaskCategory(formData);
            }}
          >
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full", CATEGORY_DOTS[option])}
            />
            <span className="min-w-0 flex-1">
              {TASK_CATEGORY_LABELS[option]}
            </span>
            {option === task.category ? (
              <span className="text-label text-muted-foreground">valgt</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddSection({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3 justify-start text-muted-foreground"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Plus />
        Legg til seksjon
      </Button>
    );
  }

  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = name.trim();
        if (next) {
          onAdd(next);
        }
        setName("");
        setOpen(false);
      }}
    >
      <Input
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        placeholder="Seksjon"
        className="h-8"
        autoFocus
      />
      <Button type="submit" size="sm">
        Legg til
      </Button>
    </form>
  );
}

function uniqueSections(values: Array<string | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function allowDrop(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function readDrag(event: DragEvent): { taskId: string } | null {
  event.preventDefault();
  const raw =
    event.dataTransfer.getData("application/json") ||
    event.dataTransfer.getData("text/plain");
  try {
    const parsed = JSON.parse(raw) as { taskId?: string };
    return parsed.taskId ? { taskId: parsed.taskId } : null;
  } catch {
    return null;
  }
}

function assigneeTone(id: string): string {
  let hash = 0;
  for (const char of id) {
    hash = (hash + char.charCodeAt(0)) % ASSIGNEE_TONES.length;
  }
  return ASSIGNEE_TONES[hash] ?? ASSIGNEE_TONES[0];
}
