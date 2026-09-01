import { deleteAnthropicKey, saveAnthropicKey } from "@/app/w/[workspace]/settings/actions";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspace: slug } = await params;
  const { saved, error } = await searchParams;
  const { userId, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  const { data: credential } = await supabase
    .from("user_credentials")
    .select("key_last4")
    .eq("user_id", userId)
    .eq("provider", "anthropic")
    .maybeSingle<{ key_last4: string }>();

  return (
    <PageFrame>
      <PageHeader
        title="Innstillinger"
        description="Claude-nøkkelen din lagres kryptert og brukes bare i dette systemet. Claude.ai-abonnement kan ikke brukes her."
      />

      <section className="max-w-lg space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/8">
        <h2 className="font-heading text-section">Anthropic API-nøkkel</h2>
        {credential ? (
          <p className="font-mono text-sm text-muted-foreground">
            Lagret nøkkel: sk-ant-…{credential.key_last4}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ingen nøkkel lagret. Lim inn en nøkkel fra Anthropic Console.
          </p>
        )}
        {saved === "1" ? (
          <p className="text-sm text-[#2F6F62]">Nøkkelen er lagret.</p>
        ) : null}
        {error === "invalid" ? (
          <p className="text-sm text-destructive">
            Nøkkelen må starte med sk-ant-.
          </p>
        ) : null}
        <form action={saveAnthropicKey} className="space-y-3">
          <input type="hidden" name="workspace_slug" value={slug} />
          <div className="space-y-2">
            <Label htmlFor="api_key">API-nøkkel</Label>
            <Input
              id="api_key"
              name="api_key"
              type="password"
              required
              autoComplete="off"
              className="h-9"
              placeholder="sk-ant-…"
            />
          </div>
          <Button type="submit">Lagre nøkkel</Button>
        </form>
        {credential ? (
          <form action={deleteAnthropicKey}>
            <input type="hidden" name="workspace_slug" value={slug} />
            <Button type="submit" variant="ghost">
              Fjern nøkkel
            </Button>
          </form>
        ) : null}
      </section>
    </PageFrame>
  );
}
