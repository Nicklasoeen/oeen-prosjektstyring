import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

export const privateSchema = pgSchema("private");

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "member",
  "viewer",
]);

export const projectStageEnum = pgEnum("project_stage", [
  "new",
  "kickoff",
  "design",
  "production",
  "review",
  "launch",
  "completed",
]);

export const projectTypeEnum = pgEnum("project_type", [
  "custom_website",
  "landing_page",
  "graphic",
  "other",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "in_review",
  "done",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "urgent",
]);

/** Only 'design' and 'development' time counts toward production-hour estimates. */
export const taskCategoryEnum = pgEnum("task_category", [
  "design",
  "development",
  "other",
]);

/** `private.is_workspace_member` / `private.workspace_has_members` / `private.workspace_role` live in SQL migrations (security definer, avoids recursive RLS). */
const isWorkspaceMember = (workspaceId: AnyPgColumn) =>
  sql`(select private.is_workspace_member(${workspaceId}))`;

const workspaceHasMembers = (workspaceId: AnyPgColumn) =>
  sql`(select private.workspace_has_members(${workspaceId}))`;

const workspaceRole = (workspaceId: AnyPgColumn) =>
  sql`(select private.workspace_role(${workspaceId}))`;

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [authUsers.id],
      name: "users_id_fk",
    }).onDelete("cascade"),
    // Rows are created by private.handle_new_user on auth.users insert.
    pgPolicy("users_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.id} = ${authUid}`,
    }),
    pgPolicy("users_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.id} = ${authUid}`,
    }),
    pgPolicy("users_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.id} = ${authUid}`,
      withCheck: sql`${table.id} = ${authUid}`,
    }),
  ]
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    colorAccent: text("color_accent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspaces_slug_idx").on(table.slug),
    pgPolicy("workspaces_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.id),
    }),
    pgPolicy("workspaces_insert_authenticated", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`true`,
    }),
    pgPolicy("workspaces_update_editors", {
      for: "update",
      to: authenticatedRole,
      using: sql`${workspaceRole(table.id)} in ('owner', 'member')`,
      withCheck: sql`${workspaceRole(table.id)} in ('owner', 'member')`,
    }),
    pgPolicy("workspaces_delete_owners", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${workspaceRole(table.id)} = 'owner'`,
    }),
  ]
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: workspaceRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
      name: "workspace_members_workspace_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "workspace_members_user_id_fk",
    }).onDelete("cascade"),
    uniqueIndex("workspace_members_workspace_id_user_id_idx").on(
      table.workspaceId,
      table.userId
    ),
    index("workspace_members_user_id_idx").on(table.userId),
    pgPolicy("workspace_members_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    // First-member bootstrap only. The on_workspace_created trigger already
    // inserts the creator as owner in the same transaction; this policy exists
    // so a client insert cannot join an existing workspace by guessing its id.
    // TODO(invitations): also allow insert when a pending invite for this
    // user + workspace is consumed.
    pgPolicy("workspace_members_insert_self", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = ${authUid} and not ${workspaceHasMembers(table.workspaceId)}`,
    }),
    pgPolicy("workspace_members_update_members", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("workspace_members_delete_self", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
    }),
  ]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    name: text("name").notNull(),
    stage: projectStageEnum("stage").notNull().default("new"),
    type: projectTypeEnum("type").notNull().default("other"),
    /** The client company — distinct from the contact person. */
    customerName: text("customer_name").notNull().default(""),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    oldWebsiteUrl: text("old_website_url"),
    domain: text("domain"),
    productionDomain: text("production_domain"),
    estimatedHours: numeric("estimated_hours", {
      precision: 7,
      scale: 2,
      mode: "number",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("projects_id_workspace_id_idx").on(table.id, table.workspaceId),
    index("projects_workspace_id_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
      name: "projects_workspace_id_fk",
    }).onDelete("cascade"),
    pgPolicy("projects_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("projects_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("projects_update_members", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("projects_delete_members", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
  ]
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    title: text("title").notNull(),
    status: taskStatusEnum("status").notNull().default("todo"),
    section: text("section"),
    category: taskCategoryEnum("category").notNull().default("development"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    progress: integer("progress").notNull().default(0),
    dueDate: date("due_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("tasks_id_workspace_id_idx").on(table.id, table.workspaceId),
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_project_id_status_idx").on(table.projectId, table.status),
    index("tasks_workspace_id_idx").on(table.workspaceId),
    check(
      "tasks_progress_range",
      sql`${table.progress} >= 0 and ${table.progress} <= 100`
    ),
    foreignKey({
      columns: [table.projectId, table.workspaceId],
      foreignColumns: [projects.id, projects.workspaceId],
      name: "tasks_project_id_workspace_id_fk",
    }).onDelete("cascade"),
    pgPolicy("tasks_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("tasks_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("tasks_update_members", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("tasks_delete_members", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
  ]
);

export const projectChecklistItems = pgTable(
  "project_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    label: text("label").notNull(),
    checked: boolean("checked").notNull().default(false),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("project_checklist_items_project_id_idx").on(table.projectId),
    index("project_checklist_items_workspace_id_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.projectId, table.workspaceId],
      foreignColumns: [projects.id, projects.workspaceId],
      name: "project_checklist_items_project_id_workspace_id_fk",
    }).onDelete("cascade"),
    pgPolicy("project_checklist_items_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("project_checklist_items_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("project_checklist_items_update_members", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("project_checklist_items_delete_members", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
  ]
);

export const projectNotes = pgTable(
  "project_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    projectId: uuid("project_id").notNull(),
    userId: uuid("user_id").notNull(),
    body: text("body").notNull(),
    /** Snapshot of the project stage when written; editable afterwards. */
    stage: projectStageEnum("stage"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("project_notes_project_id_idx").on(table.projectId),
    index("project_notes_workspace_id_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.projectId, table.workspaceId],
      foreignColumns: [projects.id, projects.workspaceId],
      name: "project_notes_project_id_workspace_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "project_notes_user_id_fk",
    }).onDelete("cascade"),
    pgPolicy("project_notes_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("project_notes_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
    pgPolicy("project_notes_update_members", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("project_notes_delete_members", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
  ]
);

export const taskAssignees = pgTable(
  "task_assignees",
  {
    taskId: uuid("task_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    primaryKey({
      name: "task_assignees_task_id_user_id_pk",
      columns: [table.taskId, table.userId],
    }),
    index("task_assignees_workspace_id_idx").on(table.workspaceId),
    index("task_assignees_user_id_idx").on(table.userId),
    foreignKey({
      columns: [table.taskId, table.workspaceId],
      foreignColumns: [tasks.id, tasks.workspaceId],
      name: "task_assignees_task_id_workspace_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "task_assignees_user_id_fk",
    }).onDelete("cascade"),
    pgPolicy("task_assignees_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("task_assignees_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("task_assignees_update_members", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("task_assignees_delete_members", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
  ]
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    taskId: uuid("task_id").notNull(),
    userId: uuid("user_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    note: text("note"),
  },
  (table) => [
    index("time_entries_task_id_idx").on(table.taskId),
    index("time_entries_workspace_id_idx").on(table.workspaceId),
    index("time_entries_user_id_idx").on(table.userId),
    uniqueIndex("time_entries_one_open_per_user_idx")
      .on(table.userId)
      .where(sql`${table.endedAt} is null`),
    foreignKey({
      columns: [table.taskId, table.workspaceId],
      foreignColumns: [tasks.id, tasks.workspaceId],
      name: "time_entries_task_id_workspace_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "time_entries_user_id_fk",
    }).onDelete("cascade"),
    pgPolicy("time_entries_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("time_entries_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
    pgPolicy("time_entries_update_members", {
      for: "update",
      to: authenticatedRole,
      using: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
      withCheck: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
    pgPolicy("time_entries_delete_members", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
  ]
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_log_workspace_id_created_at_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
      name: "activity_log_workspace_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "activity_log_user_id_fk",
    }).onDelete("cascade"),
    pgPolicy("activity_log_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("activity_log_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
  ]
);

export const credentialProviderEnum = pgEnum("credential_provider", [
  "anthropic",
]);

export const userCredentials = pgTable(
  "user_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    provider: credentialProviderEnum("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    keyLast4: text("key_last4").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_credentials_user_id_provider_idx").on(
      table.userId,
      table.provider
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_credentials_user_id_fk",
    }).onDelete("cascade"),
    pgPolicy("user_credentials_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
    }),
    pgPolicy("user_credentials_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.userId} = ${authUid}`,
    }),
    pgPolicy("user_credentials_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
      withCheck: sql`${table.userId} = ${authUid}`,
    }),
    pgPolicy("user_credentials_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${table.userId} = ${authUid}`,
    }),
  ]
);

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_threads_workspace_id_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
      name: "chat_threads_workspace_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "chat_threads_user_id_fk",
    }).onDelete("cascade"),
    pgPolicy("chat_threads_select_members", {
      for: "select",
      to: authenticatedRole,
      using: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
    pgPolicy("chat_threads_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
  ]
);

export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: chatRoleEnum("role").notNull(),
    content: text("content").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_messages_thread_id_idx").on(table.threadId),
    index("chat_messages_workspace_id_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [chatThreads.id],
      name: "chat_messages_thread_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
      name: "chat_messages_workspace_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "chat_messages_user_id_fk",
    }).onDelete("cascade"),
    pgPolicy("chat_messages_select_members", {
      for: "select",
      to: authenticatedRole,
      using: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
    pgPolicy("chat_messages_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isWorkspaceMember(table.workspaceId)} and ${table.userId} = ${authUid}`,
    }),
  ]
);

export const pendingActionStatusEnum = pgEnum("pending_action_status", [
  "pending",
  "confirmed",
  "rejected",
]);

export const pendingActions = pgTable(
  "pending_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    initiatedBy: uuid("initiated_by").notNull(),
    confirmedBy: uuid("confirmed_by"),
    actionType: text("action_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: pendingActionStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pending_actions_workspace_id_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.workspaceId],
      foreignColumns: [workspaces.id],
      name: "pending_actions_workspace_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.initiatedBy],
      foreignColumns: [users.id],
      name: "pending_actions_initiated_by_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.confirmedBy],
      foreignColumns: [users.id],
      name: "pending_actions_confirmed_by_fk",
    }).onDelete("cascade"),
    pgPolicy("pending_actions_select_members", {
      for: "select",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
    pgPolicy("pending_actions_insert_members", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${isWorkspaceMember(table.workspaceId)} and ${table.initiatedBy} = ${authUid}`,
    }),
    pgPolicy("pending_actions_update_members", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
      withCheck: isWorkspaceMember(table.workspaceId),
    }),
  ]
);
