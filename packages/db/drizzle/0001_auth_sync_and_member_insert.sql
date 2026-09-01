CREATE OR REPLACE FUNCTION private.workspace_has_members(_workspace_id uuid)
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
  );
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.workspace_has_members(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.workspace_has_members(uuid) TO authenticated;--> statement-breakpoint
DROP POLICY "workspace_members_insert_self_or_members" ON "workspace_members";--> statement-breakpoint
CREATE POLICY "workspace_members_insert_self" ON "workspace_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("workspace_members"."user_id" = (select auth.uid()) AND NOT (select private.workspace_has_members("workspace_members"."workspace_id")));--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text || '@users.local'),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'User'
    ),
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_new_user();--> statement-breakpoint
INSERT INTO public.users (id, email, name, created_at)
SELECT
  au.id,
  COALESCE(au.email, au.id::text || '@users.local'),
  COALESCE(
    NULLIF(au.raw_user_meta_data ->> 'name', ''),
    NULLIF(au.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(split_part(COALESCE(au.email, ''), '@', 1), ''),
    'User'
  ),
  COALESCE(au.created_at, now())
FROM auth.users AS au
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.handle_new_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := (SELECT auth.uid());
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, uid, 'owner');

  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.handle_new_workspace() FROM PUBLIC;--> statement-breakpoint
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;--> statement-breakpoint
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_new_workspace();
