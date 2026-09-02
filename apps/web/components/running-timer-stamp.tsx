"use client";

import { useEffect, useState } from "react";

import { stopRunningTimer } from "@/app/w/[workspace]/projects/actions";
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
  const label = elsewhere
    ? `${timer.projectName} i ${timer.workspaceName}`
    : timer.projectName;

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [timer.startedAt]);

  return (
    <form action={stopRunningTimer} className={cn("min-w-0", className)}>
      <input type="hidden" name="workspace_slug" value={slug} />
      <button
        type="submit"
        title="Stopp timern"
        aria-label={`Stopp timern på ${label}, kjørt i ${elapsed}`}
        className="flex w-full min-w-0 items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-left text-foreground transition-colors hover:bg-muted/80"
      >
        <span
          aria-hidden
          className="relative flex size-2 shrink-0 items-center justify-center"
        >
          <span className="absolute size-2 animate-ping rounded-full bg-workspace-accent opacity-40" />
          <span className="size-1.5 rounded-full bg-workspace-accent" />
        </span>
        <span className="min-w-0 truncate text-sm font-medium">{label}</span>
        <time
          dateTime={timer.startedAt}
          suppressHydrationWarning
          className="shrink-0 font-mono text-sm font-semibold tabular-nums tracking-tight"
        >
          {elapsed}
        </time>
      </button>
    </form>
  );
}
