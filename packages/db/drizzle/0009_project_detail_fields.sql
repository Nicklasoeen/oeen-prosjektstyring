CREATE TYPE "public"."project_type" AS ENUM('custom_website', 'landing_page', 'graphic', 'other');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "type" "project_type" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "production_domain" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "section" text;--> statement-breakpoint
CREATE TYPE "public"."task_status_new" AS ENUM('todo', 'in_progress', 'in_review', 'done');--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "public"."task_status_new" USING (
  CASE
    WHEN "status"::text = 'doing' THEN 'in_progress'
    WHEN "status"::text IN ('todo', 'in_progress', 'in_review', 'done') THEN "status"::text
    ELSE 'todo'
  END
)::"public"."task_status_new";--> statement-breakpoint
DROP TYPE "public"."task_status";--> statement-breakpoint
ALTER TYPE "public"."task_status_new" RENAME TO "task_status";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'todo'::"public"."task_status";--> statement-breakpoint
CREATE INDEX "tasks_project_id_status_idx" ON "tasks" USING btree ("project_id","status");
