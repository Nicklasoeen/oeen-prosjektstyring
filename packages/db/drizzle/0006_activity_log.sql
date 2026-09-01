CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "activity_log_workspace_id_created_at_idx" ON "activity_log" USING btree ("workspace_id","created_at");--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "activity_log_select_members" ON "activity_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("activity_log"."workspace_id")));--> statement-breakpoint
CREATE POLICY "activity_log_insert_members" ON "activity_log" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("activity_log"."workspace_id")) and "activity_log"."user_id" = (select auth.uid()));--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.activity_log TO authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE public.activity_log FROM anon;
