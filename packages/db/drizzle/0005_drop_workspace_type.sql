ALTER TABLE "workspaces" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."workspace_type";
