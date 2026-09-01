import Link from "next/link";
import { redirect } from "next/navigation";

import { sendMagicLink } from "@/app/login/actions";
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
import { isWorkspacePath } from "@/lib/auth/paths";
import { getAuthUserId } from "@/lib/auth/session";
import { getOrCreateDefaultWorkspace } from "@/lib/auth/workspace-access";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const error = params.error;
  const next = params.next ?? "/";
  const userId = await getAuthUserId();

  if (userId) {
    if (isWorkspacePath(next)) {
      redirect(next);
    }
    const supabase = await createClient();
    const slug = await getOrCreateDefaultWorkspace(supabase, userId);
    redirect(`/w/${slug}/dashboard`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Logg inn</CardTitle>
          <CardDescription>
            Vi sender en magisk lenke til e-posten din. Ingen passord.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-3 text-sm">
              <p>Sjekk innboksen — og eventuelt spam — for innloggingslenken.</p>
              {process.env.NODE_ENV === "development" ? (
                <p className="text-muted-foreground">
                  Lokalt finner du e-posten i Mailpit:{" "}
                  <Link
                    className="underline underline-offset-4"
                    href="http://127.0.0.1:54324"
                  >
                    http://127.0.0.1:54324
                  </Link>
                </p>
              ) : null}
            </div>
          ) : (
            <form action={sendMagicLink} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="deg@example.com"
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive">
                  {error === "missing"
                    ? "Skriv inn e-postadressen din."
                    : error}
                </p>
              ) : null}
              <Button type="submit" className="w-full">
                Send magisk lenke
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
