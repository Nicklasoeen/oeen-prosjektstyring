CREATE SCHEMA "private";
--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."workspace_type" AS ENUM('student', 'enk', 'job');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "workspace_type" NOT NULL,
	"color_accent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.is_workspace_member(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS wm
    WHERE wm.workspace_id = _workspace_id
      AND wm.user_id = (SELECT auth.uid())
  );
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.is_workspace_member(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid) TO authenticated;--> statement-breakpoint
GRANT USAGE ON SCHEMA private TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspaces TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_members TO authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE public.users FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.workspaces FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.workspace_members FROM anon;--> statement-breakpoint
CREATE POLICY "users_select_own" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("users"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users_insert_own" ON "users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("users"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users_update_own" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("users"."id" = (select auth.uid())) WITH CHECK ("users"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "workspace_members_select_members" ON "workspace_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE POLICY "workspace_members_insert_self_or_members" ON "workspace_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("workspace_members"."user_id" = (select auth.uid()) or (select private.is_workspace_member("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE POLICY "workspace_members_update_members" ON "workspace_members" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("workspace_members"."workspace_id"))) WITH CHECK ((select private.is_workspace_member("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE POLICY "workspace_members_delete_members" ON "workspace_members" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE POLICY "workspaces_select_members" ON "workspaces" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("workspaces"."id")));--> statement-breakpoint
CREATE POLICY "workspaces_insert_authenticated" ON "workspaces" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspaces_update_members" ON "workspaces" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("workspaces"."id"))) WITH CHECK ((select private.is_workspace_member("workspaces"."id")));--> statement-breakpoint
CREATE POLICY "workspaces_delete_members" ON "workspaces" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select private.is_workspace_member("workspaces"."id")));