CREATE TYPE "public"."project_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'doing', 'done');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "task_assignees" (
	"task_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "task_assignees_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "task_assignees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_progress_range" CHECK ("tasks"."progress" >= 0 and "tasks"."progress" <= 100)
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_id_workspace_id_idx" ON "projects" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_id_workspace_id_idx" ON "tasks" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE INDEX "tasks_project_id_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_workspace_id_idx" ON "tasks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "task_assignees_workspace_id_idx" ON "task_assignees" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "task_assignees_user_id_idx" ON "task_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_entries_task_id_idx" ON "time_entries" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "time_entries_workspace_id_idx" ON "time_entries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_id_idx" ON "time_entries" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "time_entries_one_open_per_user_idx" ON "time_entries" USING btree ("user_id") WHERE "time_entries"."ended_at" is null;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_workspace_id_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_workspace_id_fk" FOREIGN KEY ("task_id","workspace_id") REFERENCES "public"."tasks"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_workspace_id_fk" FOREIGN KEY ("task_id","workspace_id") REFERENCES "public"."tasks"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "projects_select_members" ON "projects" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("projects"."workspace_id")));--> statement-breakpoint
CREATE POLICY "projects_insert_members" ON "projects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("projects"."workspace_id")));--> statement-breakpoint
CREATE POLICY "projects_update_members" ON "projects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("projects"."workspace_id"))) WITH CHECK ((select private.is_workspace_member("projects"."workspace_id")));--> statement-breakpoint
CREATE POLICY "projects_delete_members" ON "projects" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("projects"."workspace_id")));--> statement-breakpoint
CREATE POLICY "task_assignees_select_members" ON "task_assignees" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("task_assignees"."workspace_id")));--> statement-breakpoint
CREATE POLICY "task_assignees_insert_members" ON "task_assignees" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("task_assignees"."workspace_id")));--> statement-breakpoint
CREATE POLICY "task_assignees_update_members" ON "task_assignees" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("task_assignees"."workspace_id"))) WITH CHECK ((select private.is_workspace_member("task_assignees"."workspace_id")));--> statement-breakpoint
CREATE POLICY "task_assignees_delete_members" ON "task_assignees" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("task_assignees"."workspace_id")));--> statement-breakpoint
CREATE POLICY "tasks_select_members" ON "tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("tasks"."workspace_id")));--> statement-breakpoint
CREATE POLICY "tasks_insert_members" ON "tasks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("tasks"."workspace_id")));--> statement-breakpoint
CREATE POLICY "tasks_update_members" ON "tasks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("tasks"."workspace_id"))) WITH CHECK ((select private.is_workspace_member("tasks"."workspace_id")));--> statement-breakpoint
CREATE POLICY "tasks_delete_members" ON "tasks" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("tasks"."workspace_id")));--> statement-breakpoint
CREATE POLICY "time_entries_select_members" ON "time_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("time_entries"."workspace_id")));--> statement-breakpoint
CREATE POLICY "time_entries_insert_members" ON "time_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("time_entries"."workspace_id")) and "time_entries"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "time_entries_update_members" ON "time_entries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("time_entries"."workspace_id")) and "time_entries"."user_id" = (select auth.uid())) WITH CHECK ((select private.is_workspace_member("time_entries"."workspace_id")) and "time_entries"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "time_entries_delete_members" ON "time_entries" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("time_entries"."workspace_id")) and "time_entries"."user_id" = (select auth.uid()));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_assignees TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.time_entries TO authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE public.projects FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.tasks FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.task_assignees FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.time_entries FROM anon;