CREATE OR REPLACE FUNCTION private.workspace_role(_workspace_id uuid)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wm.role::text
  FROM public.workspace_members AS wm
  WHERE wm.workspace_id = _workspace_id
    AND wm.user_id = (SELECT auth.uid())
  LIMIT 1;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.workspace_role(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.workspace_role(uuid) TO authenticated;--> statement-breakpoint
DROP POLICY IF EXISTS "workspaces_update_members" ON public.workspaces;--> statement-breakpoint
CREATE POLICY "workspaces_update_editors" ON public.workspaces
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((select private.workspace_role("workspaces"."id") in ('owner', 'member')))
  WITH CHECK ((select private.workspace_role("workspaces"."id") in ('owner', 'member')));--> statement-breakpoint
DROP POLICY IF EXISTS "workspaces_delete_members" ON public.workspaces;--> statement-breakpoint
CREATE POLICY "workspaces_delete_owners" ON public.workspaces
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((select private.workspace_role("workspaces"."id") = 'owner'));--> statement-breakpoint
DROP POLICY IF EXISTS "workspace_members_delete_members" ON public.workspace_members;--> statement-breakpoint
CREATE POLICY "workspace_members_delete_self" ON public.workspace_members
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ("workspace_members"."user_id" = (select auth.uid()));
