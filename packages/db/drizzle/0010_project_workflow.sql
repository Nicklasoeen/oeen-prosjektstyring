CREATE TYPE "public"."project_stage" AS ENUM('new', 'kickoff', 'design', 'production', 'review', 'launch', 'completed');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('design', 'development', 'other');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "stage" "project_stage" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "customer_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "old_website_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "estimated_hours" numeric(7, 2);--> statement-breakpoint
UPDATE "projects" SET "stage" = 'completed' WHERE "status" = 'archived';--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."project_status";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "category" "task_category" DEFAULT 'development' NOT NULL;--> statement-breakpoint
CREATE TABLE "project_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_checklist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"stage" "project_stage",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "project_checklist_items_project_id_idx" ON "project_checklist_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_checklist_items_workspace_id_idx" ON "project_checklist_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "project_notes_project_id_idx" ON "project_notes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_notes_workspace_id_idx" ON "project_notes" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "project_checklist_items" ADD CONSTRAINT "project_checklist_items_project_id_workspace_id_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_workspace_id_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "project_checklist_items_select_members" ON "project_checklist_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("project_checklist_items"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_checklist_items_insert_members" ON "project_checklist_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("project_checklist_items"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_checklist_items_update_members" ON "project_checklist_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("project_checklist_items"."workspace_id"))) WITH CHECK ((select private.is_workspace_member("project_checklist_items"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_checklist_items_delete_members" ON "project_checklist_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("project_checklist_items"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_notes_select_members" ON "project_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("project_notes"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_notes_insert_members" ON "project_notes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("project_notes"."workspace_id")) and "project_notes"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "project_notes_update_members" ON "project_notes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("project_notes"."workspace_id"))) WITH CHECK ((select private.is_workspace_member("project_notes"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_notes_delete_members" ON "project_notes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("project_notes"."workspace_id")));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_checklist_items TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_notes TO authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE public.project_checklist_items FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.project_notes FROM anon;--> statement-breakpoint
INSERT INTO "project_notes" ("workspace_id", "project_id", "user_id", "body", "stage")
SELECT p."workspace_id", p."id", owner_member."user_id", p."notes", NULL
FROM "projects" p
JOIN LATERAL (
  SELECT wm."user_id"
  FROM "workspace_members" wm
  WHERE wm."workspace_id" = p."workspace_id"
  ORDER BY CASE WHEN wm."role" = 'owner' THEN 0 ELSE 1 END, wm."created_at"
  LIMIT 1
) owner_member ON true
WHERE p."notes" IS NOT NULL AND length(trim(p."notes")) > 0;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "notes";--> statement-breakpoint
INSERT INTO "project_checklist_items" ("workspace_id", "project_id", "label", "checked", "is_custom")
SELECT p."workspace_id", p."id", defaults."label", false, false
FROM "projects" p
CROSS JOIN (
  VALUES
    ('Har kunden bilder/logo?'),
    ('Lager kunden innhold selv?'),
    ('Skal kunden ha Trafikk (SEO-produkt)?'),
    ('Skriver kunden tekst selv?'),
    ('Har kunden domeneinnlogging?'),
    ('Kundeuttalelse etterspurt?')
) AS defaults("label");
