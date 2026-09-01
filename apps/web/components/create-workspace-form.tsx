"use client";

import { useState, type CSSProperties } from "react";

import { createWorkspace } from "@/app/w/new/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  defaultAccentForType,
  isWorkspaceType,
  resolveWorkspaceAccent,
  WORKSPACE_ACCENT_OPTIONS,
  type WorkspaceType,
} from "@/lib/workspace-accent";

const TYPE_OPTIONS: Array<{ value: WorkspaceType; label: string }> = [
  { value: "student", label: "Student" },
  { value: "enk", label: "ENK" },
  { value: "job", label: "Jobb" },
];

export function CreateWorkspaceForm({ error }: { error?: string }) {
  const [type, setType] = useState<WorkspaceType>("student");
  const [accent, setAccent] = useState(defaultAccentForType("student"));
  const [accentTouched, setAccentTouched] = useState(false);
  const resolved = resolveWorkspaceAccent(accent, type);

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
          placeholder="F.eks. Student, ENK, Jobb"
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          required
          value={type}
          onChange={(event) => {
            const next = event.target.value;
            if (!isWorkspaceType(next)) {
              return;
            }
            setType(next);
            if (!accentTouched) {
              setAccent(defaultAccentForType(next));
            }
          }}
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
                    setAccentTouched(true);
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
          {error === "invalid"
            ? "Fyll inn navn, type og farge."
            : error}
        </p>
      ) : null}
      <Button type="submit" className="w-full">
        Opprett workspace
      </Button>
    </form>
  );
}
