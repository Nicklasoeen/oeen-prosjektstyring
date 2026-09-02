-- Data now lives in projects.custom_fields (see 0011).
ALTER TABLE "projects" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "customer_name";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "domain";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "production_domain";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "contact_name";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "contact_email";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "old_website_url";--> statement-breakpoint
DROP TYPE "public"."project_type";
