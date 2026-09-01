import type { CSSProperties, ReactNode } from "react";

import { resolveWorkspaceAccent } from "@/lib/workspace-accent";

export function WorkspaceTheme({
  accent,
  children,
}: {
  accent: string | null;
  children: ReactNode;
}) {
  const resolved = resolveWorkspaceAccent(accent);

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
