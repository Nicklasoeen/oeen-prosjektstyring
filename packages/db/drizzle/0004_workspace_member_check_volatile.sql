CREATE OR REPLACE FUNCTION private.is_workspace_member(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
VOLATILE
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
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid) TO authenticated;
