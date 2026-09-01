"use client";

import { ChevronDown } from "lucide-react";
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
  const [showOptional, setShowOptional] = useState(false);

  return (
    <form action={createProject} className="flex w-full flex-col gap-4">
      <input type="hidden" name="workspace_slug" value={slug} />
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
          <Label htmlFor="customer_name">Kunde (firma)</Label>
          <Input
            id="customer_name"
            name="customer_name"
            required
            placeholder="F.eks. Fjellsport AS"
            className="h-10"
          />
        </div>
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

      <button
        type="button"
        onClick={() => {
          setShowOptional((current) => !current);
        }}
        className="flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            showOptional && "rotate-180"
          )}
        />
        Flere detaljer (valgfritt)
      </button>

      <div className={cn("grid gap-4 sm:grid-cols-2", !showOptional && "hidden")}>
        <div className="space-y-2">
          <Label htmlFor="new_contact_name">Kontaktperson</Label>
          <Input
            id="new_contact_name"
            name="contact_name"
            placeholder="Navn"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_contact_email">Kontakt-e-post</Label>
          <Input
            id="new_contact_email"
            name="contact_email"
            type="email"
            placeholder="navn@kunde.no"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_old_website_url">Gammel nettside</Label>
          <Input
            id="new_old_website_url"
            name="old_website_url"
            placeholder="https://gammel-side.no"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_estimated_hours">Estimerte timer</Label>
          <Input
            id="new_estimated_hours"
            name="estimated_hours"
            type="number"
            min="0"
            step="0.5"
            placeholder="F.eks. 20"
            className="h-10"
          />
        </div>
      </div>

      {error === "invalid" ? (
        <p className="text-sm text-destructive">
          Gi prosjektet et navn, fyll inn kunde og velg type.
        </p>
      ) : null}
      {error === "email" ? (
        <p className="text-sm text-destructive">
          Skriv inn en gyldig kontakt-e-post.
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
