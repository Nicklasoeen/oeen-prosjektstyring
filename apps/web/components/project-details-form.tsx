"use client";

import { useState } from "react";

import { updateProjectDetails } from "@/app/w/[workspace]/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  type ProjectType,
} from "@/lib/projects";
import { cn } from "@/lib/utils";

export function ProjectDetailsForm({
  slug,
  projectId,
  type: initialType,
  domain,
  productionDomain,
  contactName,
  contactEmail,
  canEdit,
  saved,
  error,
}: {
  slug: string;
  projectId: string;
  type: ProjectType;
  domain: string | null;
  productionDomain: string | null;
  contactName: string | null;
  contactEmail: string | null;
  canEdit: boolean;
  saved?: boolean;
  error?: string;
}) {
  const [type, setType] = useState<ProjectType>(initialType);

  return (
    <form action={updateProjectDetails} className="space-y-5">
      <input type="hidden" name="workspace_slug" value={slug} />
      <input type="hidden" name="project_id" value={projectId} />
      <fieldset className="space-y-2" disabled={!canEdit}>
        <legend className="text-sm font-medium">Type</legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {PROJECT_TYPES.map((option) => {
            const selected = option === type;
            return (
              <label
                key={option}
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
                  name="type"
                  value={option}
                  checked={selected}
                  disabled={!canEdit}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="domain">Domene</Label>
          <Input
            id="domain"
            name="domain"
            defaultValue={domain ?? ""}
            disabled={!canEdit}
            placeholder="preview.example.com"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="production_domain">Produksjonsdomene</Label>
          <Input
            id="production_domain"
            name="production_domain"
            defaultValue={productionDomain ?? ""}
            disabled={!canEdit}
            placeholder="example.com"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_name">Kontaktperson</Label>
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={contactName ?? ""}
            disabled={!canEdit}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_email">Kontakt-e-post</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={contactEmail ?? ""}
            disabled={!canEdit}
            className="h-10"
          />
        </div>
      </div>
      {saved ? (
        <p className="text-sm text-workspace-accent">Detaljene er lagret.</p>
      ) : null}
      {error === "invalid" ? (
        <p className="text-sm text-destructive">Velg en gyldig prosjekttype.</p>
      ) : null}
      {error === "email" ? (
        <p className="text-sm text-destructive">Skriv inn en gyldig e-post.</p>
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
