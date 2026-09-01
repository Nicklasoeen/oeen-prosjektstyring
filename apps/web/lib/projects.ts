export const PROJECT_TYPES = [
  "custom_website",
  "landing_page",
  "graphic",
  "other",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  custom_website: "Custom nettside",
  landing_page: "Landingsside",
  graphic: "Grafisk",
  other: "Annet",
};

export function isProjectType(value: string): value is ProjectType {
  return (PROJECT_TYPES as readonly string[]).includes(value);
}

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "in_review",
  "done",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Åpen",
  in_progress: "Pågår",
  in_review: "Til gjennomgang",
  done: "Ferdig",
};

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export const TASK_PRIORITIES = ["low", "medium", "urgent"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

export const PROJECT_TABS = ["oversikt", "oppgaver", "detaljer"] as const;

export type ProjectTab = (typeof PROJECT_TABS)[number];

export function resolveProjectTab(value: string | undefined): ProjectTab {
  if (value && (PROJECT_TABS as readonly string[]).includes(value)) {
    return value as ProjectTab;
  }
  return "oversikt";
}
