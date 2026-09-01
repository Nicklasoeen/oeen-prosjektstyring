import { cn } from "@/lib/utils";
import {
  resolveWorkspaceAccent,
  type WorkspaceType,
} from "@/lib/workspace-accent";

export function AccentDot({
  accent,
  type,
  className,
}: {
  accent: string | null;
  type: WorkspaceType;
  className?: string;
}) {
  const { hex } = resolveWorkspaceAccent(accent, type);

  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: hex }}
    />
  );
}
