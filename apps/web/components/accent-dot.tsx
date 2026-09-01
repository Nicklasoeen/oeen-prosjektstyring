import { cn } from "@/lib/utils";
import { resolveWorkspaceTheme } from "@/lib/workspace-accent";

export function AccentDot({
  accent,
  className,
}: {
  accent: string | null;
  className?: string;
}) {
  const theme = resolveWorkspaceTheme(accent);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-4 shrink-0 overflow-hidden rounded-full ring-1 ring-black/8",
        className
      )}
    >
      <span className="h-full w-1/3" style={{ backgroundColor: theme.soft }} />
      <span className="h-full w-1/3" style={{ backgroundColor: theme.mid }} />
      <span className="h-full w-1/3" style={{ backgroundColor: theme.solid }} />
    </span>
  );
}
