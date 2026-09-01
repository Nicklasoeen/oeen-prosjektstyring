import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getOrCreateDefaultWorkspace } from "@/lib/auth/workspace-access";
import { getAuthUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const userId = await getAuthUserId();

  if (userId) {
    const supabase = await createClient();
    const slug = await getOrCreateDefaultWorkspace(supabase, userId);
    redirect(`/w/${slug}/dashboard`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-medium tracking-tight">
          Øen prosjektstyring
        </h1>
        <p className="text-sm text-muted-foreground">
          Logg inn med magisk lenke. Ingen passord.
        </p>
      </div>
      <Button asChild>
        <Link href="/login">Logg inn</Link>
      </Button>
    </main>
  );
}
