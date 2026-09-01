"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateProjectNotes } from "@/app/w/[workspace]/projects/actions";
import { Textarea } from "@/components/ui/textarea";

export function ProjectNotes({
  slug,
  projectId,
  notes,
  canEdit,
}: {
  slug: string;
  projectId: string;
  notes: string;
  canEdit: boolean;
}) {
  const [value, setValue] = useState(notes);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, startTransition] = useTransition();
  const lastSaved = useRef(notes);

  useEffect(() => {
    setValue(notes);
    lastSaved.current = notes;
  }, [notes]);

  useEffect(() => {
    if (!canEdit || value === lastSaved.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      const formData = new FormData();
      formData.set("workspace_slug", slug);
      formData.set("project_id", projectId);
      formData.set("notes", value);
      setStatus("saving");
      startTransition(async () => {
        await updateProjectNotes(formData);
        lastSaved.current = value;
        setStatus("saved");
      });
    }, 800);
    return () => {
      window.clearTimeout(timer);
    };
  }, [canEdit, projectId, slug, value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Notater</p>
        <p className="text-label text-muted-foreground">
          {pending || status === "saving"
            ? "Lagrer…"
            : status === "saved"
              ? "Lagret"
              : "Lagres automatisk"}
        </p>
      </div>
      <Textarea
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("idle");
        }}
        disabled={!canEdit}
        placeholder="Scratchpad for prosjektet — fritekst, lenker, det du trenger å huske."
        className="min-h-64"
      />
    </div>
  );
}
