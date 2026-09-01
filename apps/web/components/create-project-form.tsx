"use client";

import { useState } from "react";

import { createProject } from "@/app/w/[workspace]/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from "@/lib/projects";
import { cn } from "@/lib/utils";

export function CreateProjectForm({
  slug,
  error,
}: {
  slug: string;
  error?: string;
}) {
  const [type, setType] = useState<ProjectType>("custom_website");

  return (
    <form action={createProject} className="flex w-full flex-col gap-4">
      <input type="hidden" name="workspace_slug" value={slug} />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="name">Nytt prosjekt</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="F.eks. Nettside"
            className="h-10"
          />
        </div>
        <Button type="submit" className="h-10">
          Opprett
        </Button>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Type</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {PROJECT_TYPES.map((option) => {
            const selected = option === type;
            return (
              <label
                key={option}
                className={cn(
                  "cursor-pointer rounded-xl border bg-card px-3 py-2.5 text-sm font-medium transition-shadow",
                  selected
                    ? "border-transparent ring-2 ring-foreground"
                    : "border-border hover:border-foreground/15"
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={option}
                  checked={selected}
                  onChange={() => {
                    setType(option);
                  }}
                  className="sr-only"
                />
                {PROJECT_TYPE_LABELS[option]}
              </label>
            );
          })}
        </div>
      </fieldset>
      {error === "invalid" ? (
        <p className="text-sm text-destructive">
          Gi prosjektet et navn og velg type.
        </p>
      ) : null}
    </form>
  );
}
