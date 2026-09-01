import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { WorkspaceTheme } from "@/components/workspace-theme";
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
    <WorkspaceTheme accent={membership.colorAccent}>
      <AppShell slug={slug} workspaces={workspaces}>
        {children}
      </AppShell>
    </WorkspaceTheme>
  );
}
