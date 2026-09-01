import type { ReactNode } from "react";

import {
  resolveWorkspaceTheme,
  workspaceThemeCssVars,
} from "@/lib/workspace-accent";

export function WorkspaceTheme({
  accent,
  children,
}: {
  accent: string | null;
  children: ReactNode;
}) {
  const theme = resolveWorkspaceTheme(accent);

  return (
    <div className="min-h-screen bg-background" style={workspaceThemeCssVars(theme)}>
      {children}
    </div>
  );
}
