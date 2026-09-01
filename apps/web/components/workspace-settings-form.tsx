"use client";

import { useState } from "react";

import { updateWorkspace } from "@/app/w/[workspace]/settings/actions";
import { ThemePicker } from "@/components/theme-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resolveWorkspaceTheme,
  workspaceThemeCssVars,
} from "@/lib/workspace-accent";

export function WorkspaceSettingsForm({
  slug,
  name,
  accent,
  canEdit,
  saved,
  error,
}: {
  slug: string;
  name: string;
  accent: string | null;
  canEdit: boolean;
  saved?: boolean;
  error?: string;
}) {
  const initial = resolveWorkspaceTheme(accent);
  const [themeId, setThemeId] = useState(initial.id);
  const theme = resolveWorkspaceTheme(themeId);

  return (
    <form
      action={updateWorkspace}
      className="space-y-5"
      style={workspaceThemeCssVars(theme)}
    >
      <input type="hidden" name="workspace_slug" value={slug} />
      <div className="space-y-2">
        <Label htmlFor="workspace_name">Navn</Label>
        <Input
          id="workspace_name"
          name="name"
          required
          defaultValue={name}
          disabled={!canEdit}
          className="h-10"
        />
      </div>
      <ThemePicker
        value={themeId}
        onChange={setThemeId}
        disabled={!canEdit}
      />
      {saved ? (
        <p className="text-sm text-workspace-on-soft">Endringene er lagret.</p>
      ) : null}
      {error === "invalid" ? (
        <p className="text-sm text-destructive">Fyll inn navn og velg et tema.</p>
      ) : null}
      {error === "forbidden" ? (
        <p className="text-sm text-destructive">
          Du har ikke tilgang til å endre dette workspace-et.
        </p>
      ) : null}
      {canEdit ? (
        <Button type="submit" className="h-10 rounded-xl">
          Lagre workspace
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Du kan se innstillingene, men ikke endre dem.
        </p>
      )}
    </form>
  );
}
