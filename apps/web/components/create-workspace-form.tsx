"use client";

import { useState, type CSSProperties } from "react";

import { createWorkspace } from "@/app/w/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WORKSPACE_ACCENT,
  resolveWorkspaceAccent,
  WORKSPACE_ACCENT_OPTIONS,
} from "@/lib/workspace-accent";

export function CreateWorkspaceForm({ error }: { error?: string }) {
  const [accent, setAccent] = useState(DEFAULT_WORKSPACE_ACCENT);
  const resolved = resolveWorkspaceAccent(accent);

  return (
    <form
      action={createWorkspace}
      className="space-y-4"
      style={
        {
          "--workspace-accent": resolved.hex,
          "--primary": resolved.hex,
          "--primary-foreground": resolved.foreground,
          "--ring": resolved.hex,
        } as CSSProperties
      }
    >
      <div className="space-y-2">
        <Label htmlFor="name">Navn</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="F.eks. Jobb"
          className="h-9"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Farge</legend>
        <p className="text-sm text-muted-foreground">
          Brukes i sidemenyen og på knapper i dette workspace-et.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {WORKSPACE_ACCENT_OPTIONS.map((option) => {
            const selected = option.hex === accent;
            return (
              <label
                key={option.hex}
                className="relative cursor-pointer"
                title={option.label}
              >
                <input
                  type="radio"
                  name="color_accent"
                  value={option.hex}
                  checked={selected}
                  onChange={() => {
                    setAccent(option.hex);
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "block size-8 rounded-full ring-2 ring-offset-2 ring-offset-card transition-shadow",
                    selected ? "ring-foreground" : "ring-transparent"
                  )}
                  style={{ backgroundColor: option.hex }}
                />
                <span className="sr-only">{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {error ? (
        <p className="text-sm text-destructive">
          {error === "invalid" ? "Fyll inn navn og velg farge." : error}
        </p>
      ) : null}
      <Button type="submit" className="w-full">
        Opprett workspace
      </Button>
    </form>
  );
}
