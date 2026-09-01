import { redirect } from "next/navigation";

import { signOut } from "@/app/login/actions";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { Button } from "@/components/ui/button";
import { getAuthUserId } from "@/lib/auth/session";
import {
  findMembershipForSlug,
  listWorkspacesForUser,
} from "@/lib/auth/workspace-access";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const userId = await getAuthUserId();

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/dashboard`)}`);
  }

  const supabase = await createClient();
  const membership = await findMembershipForSlug(supabase, userId, slug);

  if (!membership) {
    redirect("/unauthorized");
  }

  const workspaces = await listWorkspacesForUser(supabase, userId);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <WorkspaceSwitcher
          currentSlug={slug}
          workspaces={workspaces}
        />
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Logg ut
          </Button>
        </form>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
