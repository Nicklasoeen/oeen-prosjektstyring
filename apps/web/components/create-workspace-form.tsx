"use client";

import { useState } from "react";

import { createWorkspace } from "@/app/w/new/actions";
import { ThemePicker } from "@/components/theme-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_WORKSPACE_ACCENT,
  resolveWorkspaceTheme,
  workspaceThemeCssVars,
} from "@/lib/workspace-accent";

export function CreateWorkspaceForm({ error }: { error?: string }) {
  const [themeId, setThemeId] = useState(DEFAULT_WORKSPACE_ACCENT);
  const theme = resolveWorkspaceTheme(themeId);

  return (
    <form
      action={createWorkspace}
      className="space-y-5"
      style={workspaceThemeCssVars(theme)}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Navn</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="F.eks. Jobb"
          className="h-10"
        />
      </div>
      <ThemePicker value={themeId} onChange={setThemeId} />
      {error ? (
        <p className="text-sm text-destructive">
          {error === "invalid" ? "Fyll inn navn og velg tema." : error}
        </p>
      ) : null}
      <Button type="submit" className="h-10 w-full rounded-xl">
        Opprett workspace
      </Button>
    </form>
  );
}
