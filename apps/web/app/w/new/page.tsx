import { redirect } from "next/navigation";

import { CreateWorkspaceForm } from "@/components/create-workspace-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthUserId } from "@/lib/auth/session";
import { listWorkspacesForUser } from "@/lib/auth/workspace-access";
import { createClient } from "@/lib/supabase/server";

export default async function NewWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await getAuthUserId();
  if (!userId) {
    redirect("/login?next=/w/new");
  }

  const { error } = await searchParams;
  const supabase = await createClient();
  const workspaces = await listWorkspacesForUser(supabase, userId);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nytt workspace</CardTitle>
          <CardDescription>
            {workspaces.length === 0
              ? "Opprett ditt første workspace for å komme i gang."
              : "Workspaces er helt adskilte kontekster, ikke filtre."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm error={error} />
        </CardContent>
      </Card>
    </main>
  );
}
