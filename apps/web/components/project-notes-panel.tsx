"use client";

import { NotebookPen } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import {
  addProjectNote,
  updateProjectNoteStage,
} from "@/app/w/[workspace]/projects/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeNb } from "@/lib/format";
import {
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  type ProjectStage,
} from "@/lib/projects";

export type ProjectNote = {
  id: string;
  body: string;
  stage: ProjectStage | null;
  userId: string;
  createdAt: string;
};

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-label text-foreground";

export function ProjectNotesPanel({
  slug,
  projectId,
  currentStage,
  notes,
  authorNameById,
  currentUserId,
  canEdit,
}: {
  slug: string;
  projectId: string;
  currentStage: ProjectStage;
  notes: ProjectNote[];
  authorNameById: Record<string, string>;
  currentUserId: string;
  canEdit: boolean;
}) {
  const groups: Array<{ stage: ProjectStage | null; notes: ProjectNote[] }> = [
    ...PROJECT_STAGES.map((stage) => ({
      stage: stage as ProjectStage | null,
      notes: notes.filter((note) => note.stage === stage),
    })),
    { stage: null, notes: notes.filter((note) => note.stage === null) },
  ].filter((group) => group.notes.length > 0);

  return (
    <div>
      <h2 className="font-heading text-section">Notater</h2>
      {canEdit ? (
        <ComposeForm
          slug={slug}
          projectId={projectId}
          currentStage={currentStage}
        />
      ) : null}

      {groups.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/50 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-workspace-wash text-workspace-accent">
            <NotebookPen className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            Ingen notater ennå. Notater tagges automatisk med fasen prosjektet
            står i, så møtereferater og beskjeder sorterer seg selv.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <section key={group.stage ?? "none"}>
              <p className="text-label text-muted-foreground">
                {group.stage ? PROJECT_STAGE_LABELS[group.stage] : "Uten fase"}
                {" · "}
                {group.notes.length}
              </p>
              <ul className="mt-2 grid gap-2">
                {group.notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-xl bg-muted/50 p-3.5"
                  >
                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="font-mono text-label text-muted-foreground">
                        {note.userId === currentUserId
                          ? "Du"
                          : (authorNameById[note.userId] ?? "Ukjent")}
                        {" · "}
                        {formatRelativeNb(note.createdAt)}
                      </p>
                      {canEdit ? (
                        <NoteStageSelect
                          slug={slug}
                          projectId={projectId}
                          noteId={note.id}
                          stage={note.stage}
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ComposeForm({
  slug,
  projectId,
  currentStage,
}: {
  slug: string;
  projectId: string;
  currentStage: ProjectStage;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const stageRef = useRef<HTMLSelectElement>(null);

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const text = body.trim();
        if (!text) {
          return;
        }
        const formData = new FormData();
        formData.set("workspace_slug", slug);
        formData.set("project_id", projectId);
        formData.set("body", text);
        formData.set("stage", stageRef.current?.value ?? currentStage);
        startTransition(async () => {
          await addProjectNote(formData);
          setBody("");
        });
      }}
    >
      <Textarea
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
        }}
        placeholder="Nytt notat — møtereferat, beskjed fra kunden, ting å huske …"
        className="min-h-24"
      />
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-label text-muted-foreground">
          Fase
          <select
            ref={stageRef}
            defaultValue={currentStage}
            className={selectClass}
          >
            {PROJECT_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {PROJECT_STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          Legg til notat
        </Button>
      </div>
    </form>
  );
}

function NoteStageSelect({
  slug,
  projectId,
  noteId,
  stage,
}: {
  slug: string;
  projectId: string;
  noteId: string;
  stage: ProjectStage | null;
}) {
  const [, startTransition] = useTransition();

  return (
    <select
      aria-label="Flytt notat til fase"
      value={stage ?? ""}
      onChange={(event) => {
        const formData = new FormData();
        formData.set("workspace_slug", slug);
        formData.set("project_id", projectId);
        formData.set("note_id", noteId);
        formData.set("stage", event.target.value);
        startTransition(() => {
          void updateProjectNoteStage(formData);
        });
      }}
      className={selectClass}
    >
      <option value="">Uten fase</option>
      {PROJECT_STAGES.map((option) => (
        <option key={option} value={option}>
          {PROJECT_STAGE_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
