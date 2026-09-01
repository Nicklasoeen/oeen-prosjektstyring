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
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    setStatus("idle");
    if (!canEdit) {
      return;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      if (next === lastSaved.current) {
        return;
      }
      const formData = new FormData();
      formData.set("workspace_slug", slug);
      formData.set("project_id", projectId);
      formData.set("notes", next);
      setStatus("saving");
      startTransition(async () => {
        await updateProjectNotes(formData);
        lastSaved.current = next;
        setStatus("saved");
      });
    }, 800);
  }

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
          handleChange(event.target.value);
        }}
        disabled={!canEdit}
        placeholder="Scratchpad for prosjektet — fritekst, lenker, det du trenger å huske."
        className="min-h-64"
      />
    </div>
  );
}
