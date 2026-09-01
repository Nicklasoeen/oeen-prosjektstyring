import { cn } from "@/lib/utils";
import { resolveWorkspaceAccent } from "@/lib/workspace-accent";

export function AccentDot({
  accent,
  className,
}: {
  accent: string | null;
  className?: string;
}) {
  const { hex } = resolveWorkspaceAccent(accent);

  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: hex }}
    />
  );
}
