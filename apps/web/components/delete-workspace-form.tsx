"use client";

import { useState } from "react";

import { deleteWorkspace } from "@/app/w/[workspace]/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteWorkspaceForm({
  slug,
  name,
  error,
}: {
  slug: string;
  name: string;
  error?: string;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === name;

  return (
    <form action={deleteWorkspace} className="space-y-3">
      <input type="hidden" name="workspace_slug" value={slug} />
      <div className="space-y-2">
        <Label htmlFor="confirm_name">
          Skriv <span className="font-medium text-foreground">{name}</span> for
          å bekrefte
        </Label>
        <Input
          id="confirm_name"
          name="confirm_name"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
          }}
          autoComplete="off"
          className="h-10"
        />
      </div>
      {error === "confirm" ? (
        <p className="text-sm text-destructive">
          Navnet matcher ikke. Skriv workspace-navnet nøyaktig.
        </p>
      ) : null}
      {error === "forbidden" ? (
        <p className="text-sm text-destructive">
          Bare eieren kan slette workspace-et.
        </p>
      ) : null}
      <Button
        type="submit"
        variant="destructive"
        className="rounded-xl"
        disabled={!matches}
      >
        Slett workspace
      </Button>
    </form>
  );
}
