ALTER TABLE "time_entries" ADD COLUMN "project_id" uuid;--> statement-breakpoint
UPDATE "time_entries" AS te
SET "project_id" = t."project_id"
FROM "tasks" AS t
WHERE t."id" = te."task_id"
  AND t."workspace_id" = te."workspace_id";--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "task_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "time_entries_project_id_idx" ON "time_entries" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_workspace_id_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_task_id_workspace_id_fk";--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
