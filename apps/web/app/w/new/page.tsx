import { redirect } from "next/navigation";

import { createWorkspace } from "@/app/w/new/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <form action={createWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Navn</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="F.eks. Student, ENK, Jobb"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                required
                defaultValue="student"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="student">Student</option>
                <option value="enk">ENK</option>
                <option value="job">Jobb</option>
              </select>
            </div>
            {error ? (
              <p className="text-sm text-destructive">
                {error === "invalid"
                  ? "Fyll inn navn og velg type."
                  : error}
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              Opprett workspace
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
