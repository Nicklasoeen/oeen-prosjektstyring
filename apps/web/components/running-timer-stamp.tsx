"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { stopRunningTimer } from "@/app/w/[workspace]/projects/actions";
import { Button } from "@/components/ui/button";
import { formatElapsedClock } from "@/lib/format";
import type { RunningTimer } from "@/lib/running-timer";
import { cn } from "@/lib/utils";

export function RunningTimerStamp({
  slug,
  timer,
  className,
}: {
  slug: string;
  timer: RunningTimer;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const elsewhere = timer.workspaceSlug !== slug;
  const elapsed = formatElapsedClock(timer.startedAt, now);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [timer.startedAt]);

  return (
    <form
      action={stopRunningTimer}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-foreground",
        className
      )}
    >
      <input type="hidden" name="workspace_slug" value={slug} />
      <span
        aria-hidden
        className="relative flex size-2 shrink-0 items-center justify-center"
      >
        <span className="absolute size-2 animate-ping rounded-full bg-workspace-accent opacity-40" />
        <span className="size-1.5 rounded-full bg-workspace-accent" />
      </span>
      <p className="min-w-0 truncate text-sm">
        <span className="font-medium">{timer.taskTitle}</span>
        {elsewhere ? (
          <>
            <span className="opacity-70"> i </span>
            <Link
              href={`/w/${timer.workspaceSlug}/projects/${timer.projectId}`}
              className="underline-offset-4 hover:underline"
            >
              {timer.workspaceName}
            </Link>
          </>
        ) : null}
      </p>
      <time
        dateTime={timer.startedAt}
        suppressHydrationWarning
        className="shrink-0 font-mono text-sm font-semibold tabular-nums tracking-tight"
        aria-label={`Kjørt i ${elapsed}`}
      >
        {elapsed}
      </time>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 rounded-full"
      >
        Stopp
      </Button>
    </form>
  );
}
