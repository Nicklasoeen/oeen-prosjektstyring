import {
  deleteAnthropicKey,
  leaveWorkspace,
  saveAnthropicKey,
} from "@/app/w/[workspace]/settings/actions";
import { DeleteWorkspaceForm } from "@/components/delete-workspace-form";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { Surface } from "@/components/surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import {
  canDeleteWorkspace,
  canEditWorkspace,
} from "@/lib/auth/workspace-access";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    ws?: string;
    leave?: string;
    delete?: string;
  }>;
}) {
  const { workspace: slug } = await params;
  const { saved, error, ws, leave, delete: deleteError } = await searchParams;
  const { userId, workspace, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  const { data: credential } = await supabase
    .from("user_credentials")
    .select("key_last4")
    .eq("user_id", userId)
    .eq("provider", "anthropic")
    .maybeSingle<{ key_last4: string }>();

  const canEdit = canEditWorkspace(workspace.role);
  const canDelete = canDeleteWorkspace(workspace.role);
  const roleLabel =
    workspace.role === "owner"
      ? "eier"
      : workspace.role === "member"
        ? "medlem"
        : "leser";

  return (
    <PageFrame>
      <PageHeader
        title="Innstillinger"
        description={`${workspace.name} · du er ${roleLabel}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Surface className="space-y-4 p-6">
          <h2 className="font-heading text-section">Workspace</h2>
          <p className="text-sm text-muted-foreground">
            Navn og tema gjelder bare her. Adressen (slug) endres ikke.
          </p>
          <WorkspaceSettingsForm
            slug={slug}
            name={workspace.name}
            accent={workspace.colorAccent}
            canEdit={canEdit}
            saved={ws === "saved"}
            error={ws === "invalid" || ws === "forbidden" ? ws : undefined}
          />
        </Surface>

        <Surface className="space-y-4 p-6">
          <h2 className="font-heading text-section">Anthropic API-nøkkel</h2>
          <p className="text-sm text-muted-foreground">
            Nøkkelen lagres kryptert og brukes bare i dette systemet.
            Claude.ai-abonnement kan ikke brukes her.
          </p>
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
            <p className="text-sm text-workspace-accent">Nøkkelen er lagret.</p>
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
                className="h-10"
                placeholder="sk-ant-…"
              />
            </div>
            <Button type="submit">
              Lagre nøkkel
            </Button>
          </form>
          {credential ? (
            <form action={deleteAnthropicKey}>
              <input type="hidden" name="workspace_slug" value={slug} />
              <Button type="submit" variant="ghost">
                Fjern nøkkel
              </Button>
            </form>
          ) : null}
        </Surface>
      </div>

      <Surface className="space-y-6 p-6">
        <h2 className="font-heading text-section">Fareområde</h2>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Forlat workspace-et for å miste tilgangen. Dataene blir værende for
            de andre. Siste eier kan ikke forlate — slett i stedet.
          </p>
          {leave === "last_owner" ? (
            <p className="text-sm text-destructive">
              Du er siste eier og kan ikke forlate workspace-et.
            </p>
          ) : null}
          <form action={leaveWorkspace}>
            <input type="hidden" name="workspace_slug" value={slug} />
            <Button type="submit" variant="outline">
              Forlat workspace
            </Button>
          </form>
        </div>

        {canDelete ? (
          <div className="space-y-3 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Sletting fjerner workspace-et og alt innhold for godt. Dette kan
              ikke angres.
            </p>
            <DeleteWorkspaceForm
              slug={slug}
              name={workspace.name}
              error={
                deleteError === "confirm" || deleteError === "forbidden"
                  ? deleteError
                  : undefined
              }
            />
          </div>
        ) : null}
      </Surface>
    </PageFrame>
  );
}
