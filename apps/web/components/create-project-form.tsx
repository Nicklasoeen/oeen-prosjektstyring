"use client";

import Link from "next/link";
import { useState } from "react";

import { createProject } from "@/app/w/[workspace]/projects/actions";
import { DynamicProjectFields } from "@/components/dynamic-project-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectTypeSummary } from "@/lib/project-types";
import { cn } from "@/lib/utils";

const EMPTY_VALUES: Record<string, string> = {};

export function CreateProjectForm({
  slug,
  types,
  error,
}: {
  slug: string;
  types: ProjectTypeSummary[];
  error?: string;
}) {
  const [typeId, setTypeId] = useState<string>(types[0]?.id ?? "");
  const activeType = types.find((type) => type.id === typeId) ?? types[0];

  if (types.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="font-heading text-section">Nytt prosjekt</h2>
        <p className="text-sm text-muted-foreground">
          Du må definere minst én prosjekttype før du kan opprette prosjekter.
        </p>
        <Button asChild>
          <Link href={`/w/${slug}/settings/prosjekttyper`}>
            Sett opp prosjekttyper
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={createProject} className="flex w-full flex-col gap-4">
      <input type="hidden" name="workspace_slug" value={slug} />
      <input type="hidden" name="project_type_id" value={activeType?.id ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="name">Nytt prosjekt</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="F.eks. Ny nettside"
            className="h-10"
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="estimated_hours">Estimerte timer</Label>
          <Input
            id="estimated_hours"
            name="estimated_hours"
            type="number"
            min="0"
            step="0.5"
            placeholder="Valgfritt"
            className="h-10"
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Type</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {types.map((type) => {
            const selected = type.id === activeType?.id;
            return (
              <label
                key={type.id}
                className={cn(
                  "cursor-pointer rounded-xl border bg-card px-3 py-2.5 text-sm font-medium transition-shadow",
                  selected
                    ? "border-transparent ring-2 ring-foreground"
                    : "border-border hover:border-foreground/15"
                )}
              >
                <input
                  type="radio"
                  name="project_type_choice"
                  value={type.id}
                  checked={selected}
                  onChange={() => {
                    setTypeId(type.id);
                  }}
                  className="sr-only"
                />
                {type.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      {activeType ? (
        <DynamicProjectFields
          key={activeType.id}
          idPrefix={`new-${activeType.id}`}
          fields={activeType.fields}
          values={EMPTY_VALUES}
        />
      ) : null}

      {error === "invalid" ? (
        <p className="text-sm text-destructive">
          Gi prosjektet et navn og velg en type.
        </p>
      ) : null}
      {error === "fields" ? (
        <p className="text-sm text-destructive">
          Sjekk feltene — noe påkrevd mangler eller har ugyldig format.
        </p>
      ) : null}
      {error === "hours" ? (
        <p className="text-sm text-destructive">
          Timeestimatet må være et positivt tall.
        </p>
      ) : null}

      <Button type="submit" className="h-10 self-start px-6">
        Opprett prosjekt
      </Button>
    </form>
  );
}
