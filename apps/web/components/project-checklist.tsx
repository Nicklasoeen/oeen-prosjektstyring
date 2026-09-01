"use client";

import { Check, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import {
  addChecklistItem,
  toggleChecklistItem,
} from "@/app/w/[workspace]/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  isCustom: boolean;
};

export function ProjectChecklist({
  slug,
  projectId,
  items,
  canEdit,
}: {
  slug: string;
  projectId: string;
  items: ChecklistItem[];
  canEdit: boolean;
}) {
  const [, startTransition] = useTransition();
  // Optimistic checked-state so the checkbox flips immediately.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const checkedCount = items.filter(
    (item) => overrides[item.id] ?? item.checked
  ).length;

  function toggle(item: ChecklistItem) {
    if (!canEdit) {
      return;
    }
    const next = !(overrides[item.id] ?? item.checked);
    setOverrides((current) => ({ ...current, [item.id]: next }));
    const formData = new FormData();
    formData.set("workspace_slug", slug);
    formData.set("project_id", projectId);
    formData.set("item_id", item.id);
    formData.set("checked", next ? "1" : "0");
    startTransition(() => {
      void toggleChecklistItem(formData);
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-section">Sjekkliste</h2>
        <p className="font-mono text-label tabular-nums text-muted-foreground">
          {checkedCount}/{items.length}
        </p>
      </div>
      <ul className="mt-3 grid gap-1">
        {items.map((item) => {
          const checked = overrides[item.id] ?? item.checked;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  toggle(item);
                }}
                disabled={!canEdit}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                  canEdit && "hover:bg-muted/60"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                    checked
                      ? "border-workspace-accent bg-workspace-accent text-white"
                      : "border-border bg-card"
                  )}
                >
                  {checked ? <Check className="size-3" /> : null}
                </span>
                <span
                  className={cn(
                    checked && "text-muted-foreground line-through"
                  )}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {canEdit ? <AddItemForm slug={slug} projectId={projectId} /> : null}
    </div>
  );
}

function AddItemForm({
  slug,
  projectId,
}: {
  slug: string;
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 justify-start text-muted-foreground"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Plus />
        Legg til punkt
      </Button>
    );
  }

  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = label.trim();
        if (!next) {
          return;
        }
        const formData = new FormData();
        formData.set("workspace_slug", slug);
        formData.set("project_id", projectId);
        formData.set("label", next);
        startTransition(async () => {
          await addChecklistItem(formData);
          setLabel("");
          setOpen(false);
        });
      }}
    >
      <Input
        value={label}
        onChange={(event) => {
          setLabel(event.target.value);
        }}
        placeholder="Nytt sjekkpunkt"
        className="h-8"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={pending}>
        Legg til
      </Button>
    </form>
  );
}
