"use client";

import { toggleProjectTimer } from "@/app/w/[workspace]/projects/actions";
import { Button } from "@/components/ui/button";

export function ProjectTimer({
  slug,
  projectId,
  running,
  canEdit,
}: {
  slug: string;
  projectId: string;
  running: boolean;
  canEdit: boolean;
}) {
  if (!canEdit) {
    return null;
  }

  return (
    <form action={toggleProjectTimer}>
      <input type="hidden" name="workspace_slug" value={slug} />
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="intent" value={running ? "stop" : "start"} />
      <Button type="submit" variant={running ? "destructive" : "outline"}>
        {running ? "Stopp timer" : "Start timer"}
      </Button>
    </form>
  );
}
