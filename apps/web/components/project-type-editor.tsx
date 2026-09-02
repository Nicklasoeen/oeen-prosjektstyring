"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import {
  createProjectType,
  deleteProjectType,
  updateProjectType,
} from "@/app/w/[workspace]/settings/project-type-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fieldKeyFromLabel,
  PROJECT_FIELD_TYPES,
  PROJECT_FIELD_TYPE_LABELS,
  type ProjectField,
  type ProjectFieldType,
  type ProjectTypeSummary,
} from "@/lib/project-types";
import { cn } from "@/lib/utils";

type DraftField = ProjectField & { rowId: string };

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground";

let rowCounter = 0;
function nextRowId(): string {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function ProjectTypeEditor({
  slug,
  type,
  projectsUsing,
  canEdit,
}: {
  slug: string;
  type: ProjectTypeSummary;
  projectsUsing: number;
  canEdit: boolean;
}) {
  return (
    <TypeForm
      key={type.id}
      slug={slug}
      typeId={type.id}
      initialName={type.name}
      initialFields={type.fields}
      initialChecklist={type.checklist}
      projectsUsing={projectsUsing}
      canEdit={canEdit}
    />
  );
}

export function NewProjectTypeForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Plus />
        Ny prosjekttype
      </Button>
    );
  }

  return (
    <TypeForm
      slug={slug}
      initialName=""
      initialFields={[]}
      initialChecklist={[]}
      projectsUsing={0}
      canEdit
      onCancel={() => {
        setOpen(false);
      }}
    />
  );
}

function TypeForm({
  slug,
  typeId,
  initialName,
  initialFields,
  initialChecklist,
  projectsUsing,
  canEdit,
  onCancel,
}: {
  slug: string;
  typeId?: string;
  initialName: string;
  initialFields: ProjectField[];
  initialChecklist: string[];
  projectsUsing: number;
  canEdit: boolean;
  onCancel?: () => void;
}) {
  const formId = useId();
  const [fields, setFields] = useState<DraftField[]>(() =>
    initialFields.map((field) => ({ ...field, rowId: nextRowId() }))
  );
  const [checklist, setChecklist] = useState<string[]>(initialChecklist);

  const serializedFields = JSON.stringify(
    fields
      .filter((field) => field.label.trim().length > 0)
      .map((field) => ({
        key: field.key || fieldKeyFromLabel(field.label),
        label: field.label.trim(),
        type: field.type,
        required: field.required,
        ...(field.type === "select" && field.options?.length
          ? { options: field.options }
          : {}),
      }))
  );
  const serializedChecklist = JSON.stringify(
    checklist.map((row) => row.trim()).filter((row) => row.length > 0)
  );

  function updateField(rowId: string, patch: Partial<DraftField>) {
    setFields((current) =>
      current.map((field) =>
        field.rowId === rowId ? { ...field, ...patch } : field
      )
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  return (
    <form
      action={typeId ? updateProjectType : createProjectType}
      className="space-y-5"
    >
      <input type="hidden" name="workspace_slug" value={slug} />
      {typeId ? <input type="hidden" name="type_id" value={typeId} /> : null}
      <input type="hidden" name="field_schema" value={serializedFields} />
      <input
        type="hidden"
        name="checklist_template"
        value={serializedChecklist}
      />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-name`}>Navn på typen</Label>
          <Input
            id={`${formId}-name`}
            name="name"
            required
            defaultValue={initialName}
            disabled={!canEdit}
            placeholder="F.eks. Custom nettside"
            className="h-10"
          />
        </div>
        {projectsUsing > 0 ? (
          <p className="text-label text-muted-foreground">
            Brukt av {projectsUsing} prosjekt{projectsUsing === 1 ? "" : "er"}
          </p>
        ) : null}
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium">Felter</h3>
          <p className="text-label text-muted-foreground">
            Vises på opprettelse og under Detaljer
          </p>
        </div>
        {fields.length === 0 ? (
          <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            Ingen felter ennå. Legg til det du vil registrere for denne typen.
          </p>
        ) : (
          <ul className="grid gap-2">
            {fields.map((field, index) => (
              <li
                key={field.rowId}
                className="grid gap-2 rounded-xl bg-muted/50 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]"
              >
                <div className="flex items-center gap-0.5 text-muted-foreground">
                  <GripVertical className="size-4 shrink-0" aria-hidden />
                  <button
                    type="button"
                    aria-label="Flytt opp"
                    disabled={!canEdit || index === 0}
                    onClick={() => {
                      moveField(index, -1);
                    }}
                    className="rounded px-1 text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Flytt ned"
                    disabled={!canEdit || index === fields.length - 1}
                    onClick={() => {
                      moveField(index, 1);
                    }}
                    className="rounded px-1 text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <Input
                  value={field.label}
                  disabled={!canEdit}
                  aria-label="Feltnavn"
                  placeholder="Feltnavn"
                  className="h-9"
                  onChange={(event) => {
                    const label = event.target.value;
                    updateField(field.rowId, {
                      label,
                      // Keep the storage key stable once a field has been saved.
                      key: field.key || fieldKeyFromLabel(label),
                    });
                  }}
                />
                <select
                  value={field.type}
                  disabled={!canEdit}
                  aria-label="Felttype"
                  className={selectClass}
                  onChange={(event) => {
                    updateField(field.rowId, {
                      type: event.target.value as ProjectFieldType,
                    });
                  }}
                >
                  {PROJECT_FIELD_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {PROJECT_FIELD_TYPE_LABELS[option]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 px-1 text-label text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={field.required}
                    disabled={!canEdit}
                    onChange={(event) => {
                      updateField(field.rowId, {
                        required: event.target.checked,
                      });
                    }}
                  />
                  Påkrevd
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Fjern felt"
                  disabled={!canEdit}
                  onClick={() => {
                    setFields((current) =>
                      current.filter((row) => row.rowId !== field.rowId)
                    );
                  }}
                >
                  <Trash2 />
                </Button>
                {field.type === "select" ? (
                  <div className="sm:col-span-5">
                    <Input
                      value={(field.options ?? []).join(", ")}
                      disabled={!canEdit}
                      aria-label="Valg, kommaseparert"
                      placeholder="Valg, kommaseparert — f.eks. Ja, Nei, Vet ikke"
                      className="h-9"
                      onChange={(event) => {
                        updateField(field.rowId, {
                          options: event.target.value
                            .split(",")
                            .map((option) => option.trim())
                            .filter((option) => option.length > 0),
                        });
                      }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
            onClick={() => {
              setFields((current) => [
                ...current,
                {
                  rowId: nextRowId(),
                  key: "",
                  label: "",
                  type: "text",
                  required: false,
                },
              ]);
            }}
          >
            <Plus />
            Legg til felt
          </Button>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium">Sjekkliste</h3>
          <p className="text-label text-muted-foreground">
            Kopieres inn på nye prosjekter av denne typen
          </p>
        </div>
        {checklist.length === 0 ? (
          <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
            Ingen punkter ennå.
          </p>
        ) : (
          <ul className="grid gap-2">
            {checklist.map((row, index) => (
              <li key={index} className="flex gap-2">
                <Input
                  value={row}
                  disabled={!canEdit}
                  aria-label={`Sjekkpunkt ${index + 1}`}
                  className="h-9"
                  onChange={(event) => {
                    const value = event.target.value;
                    setChecklist((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? value : item
                      )
                    );
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Fjern punkt"
                  disabled={!canEdit}
                  onClick={() => {
                    setChecklist((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    );
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
            onClick={() => {
              setChecklist((current) => [...current, ""]);
            }}
          >
            <Plus />
            Legg til punkt
          </Button>
        ) : null}
      </section>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button type="submit">
            {typeId ? "Lagre endringer" : "Opprett type"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Avbryt
            </Button>
          ) : null}
          {typeId ? <DeleteTypeButton disabled={projectsUsing > 0} /> : null}
        </div>
      ) : null}
    </form>
  );
}

function DeleteTypeButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      formAction={deleteProjectType}
      formNoValidate
      disabled={disabled}
      title={
        disabled
          ? "Flytt prosjektene til en annen type først"
          : "Slett prosjekttypen"
      }
      className={cn(
        "ml-auto inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium text-destructive transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-destructive/10"
      )}
    >
      <Trash2 className="size-4" />
      Slett type
    </button>
  );
}
