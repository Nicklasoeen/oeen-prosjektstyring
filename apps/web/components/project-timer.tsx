"use client";

import { useRouter } from "next/navigation";

import {
  stopRunningTimer,
  toggleProjectTimer,
} from "@/app/w/[workspace]/projects/actions";
import { useRunningTimer } from "@/components/running-timer-provider";
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
  const router = useRouter();
  const { refresh } = useRunningTimer();

  if (!canEdit) {
    return null;
  }

  async function onToggle(formData: FormData) {
    if (running) {
      await stopRunningTimer(formData);
    } else {
      const result = await toggleProjectTimer(formData);
      if (result.stoppedName) {
        router.replace(
          `?stopped=${encodeURIComponent(result.stoppedName)}`,
          { scroll: false }
        );
      }
    }
    await refresh();
    router.refresh();
  }

  return (
    <form action={onToggle}>
      <input type="hidden" name="workspace_slug" value={slug} />
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="intent" value={running ? "stop" : "start"} />
      <Button type="submit" variant={running ? "destructive" : "outline"}>
        {running ? "Stopp timer" : "Start timer"}
      </Button>
    </form>
  );
}
