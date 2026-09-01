import type { CSSProperties, ReactNode } from "react";

import type { WorkspaceType } from "@/lib/workspace-accent";
import { resolveWorkspaceAccent } from "@/lib/workspace-accent";

export function WorkspaceTheme({
  accent,
  type,
  children,
}: {
  accent: string | null;
  type: WorkspaceType;
  children: ReactNode;
}) {
  const resolved = resolveWorkspaceAccent(accent, type);

  return (
    <div
      className="min-h-screen"
      style={
        {
          "--workspace-accent": resolved.hex,
          "--workspace-accent-foreground": resolved.foreground,
          "--primary": resolved.hex,
          "--primary-foreground": resolved.foreground,
          "--ring": resolved.hex,
          "--sidebar-primary": resolved.hex,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
