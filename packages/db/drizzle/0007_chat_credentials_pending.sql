CREATE TYPE "public"."credential_provider" AS ENUM('anthropic');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."pending_action_status" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "credential_provider" NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_last4" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pending_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"initiated_by" uuid NOT NULL,
	"confirmed_by" uuid,
	"action_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "pending_action_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "user_credentials_user_id_provider_idx" ON "user_credentials" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "chat_threads_workspace_id_idx" ON "chat_threads" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "chat_messages_thread_id_idx" ON "chat_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "chat_messages_workspace_id_idx" ON "chat_messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "pending_actions_workspace_id_idx" ON "pending_actions" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_initiated_by_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_actions" ADD CONSTRAINT "pending_actions_confirmed_by_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "user_credentials_select_own" ON "user_credentials" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_credentials_insert_own" ON "user_credentials" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_credentials_update_own" ON "user_credentials" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user_id" = (select auth.uid())) WITH CHECK ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_credentials_delete_own" ON "user_credentials" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "chat_threads_select_members" ON "chat_threads" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("chat_threads"."workspace_id")) and "chat_threads"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "chat_threads_insert_members" ON "chat_threads" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("chat_threads"."workspace_id")) and "chat_threads"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "chat_messages_select_members" ON "chat_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("chat_messages"."workspace_id")) and "chat_messages"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "chat_messages_insert_members" ON "chat_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("chat_messages"."workspace_id")) and "chat_messages"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pending_actions_select_members" ON "pending_actions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select private.is_workspace_member("pending_actions"."workspace_id")));--> statement-breakpoint
CREATE POLICY "pending_actions_insert_members" ON "pending_actions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select private.is_workspace_member("pending_actions"."workspace_id")) and "pending_actions"."initiated_by" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pending_actions_update_members" ON "pending_actions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select private.is_workspace_member("pending_actions"."workspace_id"))) WITH CHECK ((select private.is_workspace_member("pending_actions"."workspace_id")));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_credentials TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.chat_threads TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE public.chat_messages TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.pending_actions TO authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE public.user_credentials FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.chat_threads FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.chat_messages FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.pending_actions FROM anon;
