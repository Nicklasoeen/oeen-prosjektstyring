"use client";

import Link from "next/link";
import { useState } from "react";

import { updateProjectDetails } from "@/app/w/[workspace]/projects/actions";
import { DynamicProjectFields } from "@/components/dynamic-project-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectTypeSummary } from "@/lib/project-types";
import { cn } from "@/lib/utils";

export function ProjectDetailsForm({
  slug,
  projectId,
  name,
  types,
  currentTypeId,
  values,
  estimatedHours,
  canEdit,
  saved,
  error,
}: {
  slug: string;
  projectId: string;
  name: string;
  types: ProjectTypeSummary[];
  currentTypeId: string | null;
  values: Record<string, string>;
  estimatedHours: number | null;
  canEdit: boolean;
  saved?: boolean;
  error?: string;
}) {
  const [typeId, setTypeId] = useState<string>(
    currentTypeId ?? types[0]?.id ?? ""
  );
  const activeType = types.find((type) => type.id === typeId);

  if (types.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Dette workspace-et har ingen prosjekttyper ennå, så det finnes ingen
          felter å redigere.
        </p>
        <Button asChild variant="outline">
          <Link href={`/w/${slug}/settings/prosjekttyper`}>
            Sett opp prosjekttyper
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={updateProjectDetails} className="space-y-5">
      <input type="hidden" name="workspace_slug" value={slug} />
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="project_type_id" value={typeId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project_name">Prosjektnavn</Label>
          <Input
            id="project_name"
            name="name"
            required
            defaultValue={name}
            disabled={!canEdit}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimated_hours">Estimerte timer</Label>
          <Input
            id="estimated_hours"
            name="estimated_hours"
            type="number"
            min="0"
            step="0.5"
            defaultValue={estimatedHours ?? ""}
            disabled={!canEdit}
            placeholder="F.eks. 20"
            className="h-10"
          />
        </div>
      </div>

      <fieldset className="space-y-2" disabled={!canEdit}>
        <legend className="text-sm font-medium">Type</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {types.map((type) => {
            const selected = type.id === typeId;
            return (
              <label
                key={type.id}
                className={cn(
                  "rounded-xl border bg-card px-3 py-2.5 text-sm font-medium",
                  canEdit ? "cursor-pointer" : "opacity-70",
                  selected
                    ? "border-transparent ring-2 ring-foreground"
                    : "border-border"
                )}
              >
                <input
                  type="radio"
                  name="project_type_choice"
                  value={type.id}
                  checked={selected}
                  disabled={!canEdit}
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
          idPrefix={`details-${activeType.id}`}
          fields={activeType.fields}
          values={values}
          disabled={!canEdit}
        />
      ) : null}

      {saved ? (
        <p className="text-sm text-workspace-accent">Detaljene er lagret.</p>
      ) : null}
      {error === "invalid" ? (
        <p className="text-sm text-destructive">
          Gi prosjektet et navn og velg en gyldig type.
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

      {canEdit ? (
        <Button type="submit">Lagre detaljer</Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Du kan se detaljene, men ikke endre dem.
        </p>
      )}
    </form>
  );
}
