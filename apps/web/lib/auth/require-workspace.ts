import { redirect } from "next/navigation";

import { getAuthUserId } from "@/lib/auth/session";
import {
  findMembershipForSlug,
  type WorkspaceSummary,
} from "@/lib/auth/workspace-access";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireWorkspaceAccess(
  slug: string,
  nextPath?: string
): Promise<{
  userId: string;
  workspace: WorkspaceSummary;
  supabase: SupabaseClient;
}> {
  const userId = await getAuthUserId();
  if (!userId) {
    const next = nextPath ?? `/w/${slug}/projects`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const workspace = await findMembershipForSlug(supabase, userId, slug);

  if (!workspace) {
    redirect("/unauthorized");
  }

  return { userId, workspace, supabase };
}
