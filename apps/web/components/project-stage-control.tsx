"use client";

import confetti from "canvas-confetti";
import { ChevronDown, PartyPopper } from "lucide-react";
import { useTransition } from "react";

import { updateProjectStage } from "@/app/w/[workspace]/projects/actions";
import { ProjectStageBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  type ProjectStage,
} from "@/lib/projects";

function fireConfetti() {
  const defaults = { spread: 70, ticks: 220, gravity: 0.9, zIndex: 2000 };
  confetti({ ...defaults, particleCount: 90, origin: { x: 0.3, y: 0.4 } });
  confetti({ ...defaults, particleCount: 90, origin: { x: 0.7, y: 0.4 } });
  window.setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 60,
      spread: 110,
      origin: { x: 0.5, y: 0.3 },
    });
  }, 250);
}

export function ProjectStageControl({
  slug,
  projectId,
  stage,
  canEdit,
}: {
  slug: string;
  projectId: string;
  stage: ProjectStage;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return <ProjectStageBadge value={stage} />;
  }

  function selectStage(next: ProjectStage) {
    if (next === stage) {
      return;
    }
    const formData = new FormData();
    formData.set("workspace_slug", slug);
    formData.set("project_id", projectId);
    formData.set("stage", next);
    startTransition(async () => {
      await updateProjectStage(formData);
      if (next === "completed") {
        fireConfetti();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="gap-2"
        >
          <ProjectStageBadge value={stage} />
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Flytt til fase</DropdownMenuLabel>
        {PROJECT_STAGES.map((option) => (
          <DropdownMenuItem
            key={option}
            onSelect={() => {
              selectStage(option);
            }}
          >
            <span className="min-w-0 flex-1">
              {PROJECT_STAGE_LABELS[option]}
            </span>
            {option === "completed" ? (
              <PartyPopper className="size-4 text-workspace-accent" />
            ) : null}
            {option === stage ? (
              <span className="text-label text-muted-foreground">nå</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
