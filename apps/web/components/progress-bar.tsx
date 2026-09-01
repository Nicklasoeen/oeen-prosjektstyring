import { clampPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = clampPercent(value);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--workspace-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-label tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}
