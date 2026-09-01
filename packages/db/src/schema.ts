import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  foreignKey,
  index,
  pgEnum,
  pgPolicy,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

export const privateSchema = pgSchema("private");

export const workspaceTypeEnum = pgEnum("workspace_type", [
  "student",
  "enk",
  "job",
]);

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "member",
  "viewer",
]);

/** `private.is_workspace_member` / `private.workspace_has_members` live in SQL migrations (security definer, avoids recursive RLS). */
const isWorkspaceMember = (workspaceId: AnyPgColumn) =>
  sql`(select private.is_workspace_member(${workspaceId}))`;

const workspaceHasMembers = (workspaceId: AnyPgColumn) =>
  sql`(select private.workspace_has_members(${workspaceId}))`;

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
    type: workspaceTypeEnum("type").notNull(),
    colorAccent: text("color_accent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
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
    pgPolicy("workspaces_update_members", {
      for: "update",
      to: authenticatedRole,
      using: isWorkspaceMember(table.id),
      withCheck: isWorkspaceMember(table.id),
    }),
    pgPolicy("workspaces_delete_members", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceMember(table.id),
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
    pgPolicy("workspace_members_delete_members", {
      for: "delete",
      to: authenticatedRole,
      using: isWorkspaceMember(table.workspaceId),
    }),
  ]
);
