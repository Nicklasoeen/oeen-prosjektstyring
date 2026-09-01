"use client";

import { useState } from "react";

import { createWorkspace } from "@/app/w/new/actions";
import { ThemePicker } from "@/components/theme-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_WORKSPACE_ACCENT } from "@/lib/workspace-accent";

export function CreateWorkspaceForm({ error }: { error?: string }) {
  const [themeId, setThemeId] = useState(DEFAULT_WORKSPACE_ACCENT);

  return (
    <form action={createWorkspace} className="space-y-5">
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
      <Button type="submit" className="h-10 w-full">
        Opprett workspace
      </Button>
    </form>
  );
}
