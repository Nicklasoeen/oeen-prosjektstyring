CREATE TABLE "project_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"field_schema" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checklist_template" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "project_types_id_workspace_id_idx" ON "project_types" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_types_workspace_id_name_idx" ON "project_types" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "project_types_workspace_id_idx" ON "project_types" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "project_types" ADD CONSTRAINT "project_types_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "project_types_select_members" ON "project_types" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("project_types"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_types_insert_members" ON "project_types" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("project_types"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_types_update_members" ON "project_types" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("project_types"."workspace_id"))) WITH CHECK ((select private.is_workspace_member("project_types"."workspace_id")));--> statement-breakpoint
CREATE POLICY "project_types_delete_members" ON "project_types" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("project_types"."workspace_id")));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_types TO authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE public.project_types FROM anon;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_type_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "projects_project_type_id_idx" ON "projects" USING btree ("project_type_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_type_id_workspace_id_fk" FOREIGN KEY ("project_type_id","workspace_id") REFERENCES "public"."project_types"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "project_types" ("workspace_id", "name", "field_schema", "checklist_template", "sort_order")
SELECT ws."workspace_id", seed."name", shared."field_schema", seed."checklist_template", seed."sort_order"
FROM (SELECT DISTINCT "workspace_id" FROM "projects") ws
CROSS JOIN (
  VALUES
    (
      'Custom nettside',
      0,
      '["Har kunden bilder/logo?","Lager kunden innhold selv?","Skal kunden ha Trafikk (SEO-produkt)?","Skriver kunden tekst selv?","Har kunden domeneinnlogging?","Kundeuttalelse etterspurt?"]'::jsonb
    ),
    (
      'Landingsside',
      1,
      '["Har kunden bilder/logo?","Skriver kunden tekst selv?","Har kunden domeneinnlogging?","Kundeuttalelse etterspurt?"]'::jsonb
    ),
    (
      'Grafisk',
      2,
      '["Har kunden bilder/logo?","Lager kunden innhold selv?","Er filformater og leveranse avklart?","Kundeuttalelse etterspurt?"]'::jsonb
    ),
    (
      'Annet',
      3,
      '["Er omfanget avklart med kunden?","Kundeuttalelse etterspurt?"]'::jsonb
    )
) AS seed("name", "sort_order", "checklist_template")
CROSS JOIN (
  SELECT '[{"key":"customer_name","label":"Kunde (firma)","type":"text","required":true},{"key":"contact_name","label":"Kontaktperson","type":"text","required":false},{"key":"contact_email","label":"Kontakt-e-post","type":"email","required":false},{"key":"old_website_url","label":"Gammel nettside","type":"url","required":false},{"key":"domain","label":"Domene","type":"text","required":false},{"key":"production_domain","label":"Produksjonsdomene","type":"text","required":false}]'::jsonb AS "field_schema"
) AS shared;--> statement-breakpoint
UPDATE "projects" p
SET "project_type_id" = pt."id"
FROM "project_types" pt
WHERE pt."workspace_id" = p."workspace_id"
  AND pt."name" = CASE p."type"::text
    WHEN 'custom_website' THEN 'Custom nettside'
    WHEN 'landing_page' THEN 'Landingsside'
    WHEN 'graphic' THEN 'Grafisk'
    ELSE 'Annet'
  END;--> statement-breakpoint
UPDATE "projects" p
SET "custom_fields" = jsonb_strip_nulls(jsonb_build_object(
  'customer_name', nullif(btrim(coalesce(p."customer_name", '')), ''),
  'contact_name', nullif(btrim(coalesce(p."contact_name", '')), ''),
  'contact_email', nullif(btrim(coalesce(p."contact_email", '')), ''),
  'old_website_url', nullif(btrim(coalesce(p."old_website_url", '')), ''),
  'domain', nullif(btrim(coalesce(p."domain", '')), ''),
  'production_domain', nullif(btrim(coalesce(p."production_domain", '')), '')
));
