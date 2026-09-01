import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ChatDock } from "@/components/chat-dock";
import { ChatProvider } from "@/components/chat-provider";
import { WorkspaceTheme } from "@/components/workspace-theme";
import { getAuthUserId } from "@/lib/auth/session";
import {
  findMembershipForSlug,
  listWorkspacesForUser,
} from "@/lib/auth/workspace-access";
import {
  findRunningTimer,
  findUserProfile,
} from "@/lib/running-timer";
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

  const [workspaces, profile, runningTimer] = await Promise.all([
    listWorkspacesForUser(supabase, userId),
    findUserProfile(supabase, userId),
    findRunningTimer(supabase, userId),
  ]);

  return (
    <WorkspaceTheme accent={membership.colorAccent}>
      <ChatProvider>
        <AppShell
          slug={slug}
          workspaces={workspaces}
          profile={profile}
          runningTimer={runningTimer}
        >
          {children}
        </AppShell>
        <ChatDock slug={slug} />
      </ChatProvider>
    </WorkspaceTheme>
  );
}
