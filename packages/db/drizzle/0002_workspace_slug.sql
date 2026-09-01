ALTER TABLE "workspaces" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "workspaces"
SET "slug" = 'ws-' || substr(replace("id"::text, '-', ''), 1, 16)
WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_idx" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.set_workspace_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := 'ws-' || substr(replace(NEW.id::text, '-', ''), 1, 16);
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION private.set_workspace_slug() FROM PUBLIC;--> statement-breakpoint
DROP TRIGGER IF EXISTS on_workspace_set_slug ON public.workspaces;--> statement-breakpoint
CREATE TRIGGER on_workspace_set_slug
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION private.set_workspace_slug();
