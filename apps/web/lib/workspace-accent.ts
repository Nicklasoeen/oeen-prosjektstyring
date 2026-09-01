import type { CSSProperties } from "react";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type WorkspaceThemeId =
  | "tang"
  | "rav"
  | "fjord"
  | "lyng"
  | "rodberg"
  | "skjaer";

export type WorkspaceThemePalette = {
  id: WorkspaceThemeId;
  label: string;
  solid: string;
  mid: string;
  soft: string;
  wash: string;
  onSolid: string;
  onSoft: string;
  border: string;
};

export const WORKSPACE_THEMES: readonly WorkspaceThemePalette[] = [
  {
    id: "tang",
    label: "Tang",
    solid: "#2F6F62",
    mid: "#4D8F80",
    soft: "#D5EBE5",
    wash: "#F0F7F4",
    onSolid: "#FFFFFF",
    onSoft: "#1E4A42",
    border: "#B7D4CC",
  },
  {
    id: "rav",
    label: "Rav",
    solid: "#B56A32",
    mid: "#D08A52",
    soft: "#F6E4D0",
    wash: "#FBF4EC",
    onSolid: "#FFFFFF",
    onSoft: "#6B3A14",
    border: "#E8C9A8",
  },
  {
    id: "fjord",
    label: "Fjord",
    solid: "#2C4A6E",
    mid: "#4A6C94",
    soft: "#D5E2F0",
    wash: "#EEF3F8",
    onSolid: "#FFFFFF",
    onSoft: "#1C3149",
    border: "#B4C7DB",
  },
  {
    id: "lyng",
    label: "Lyng",
    solid: "#6B4E71",
    mid: "#8B6B91",
    soft: "#EBE0EE",
    wash: "#F6F1F7",
    onSolid: "#FFFFFF",
    onSoft: "#3F2C44",
    border: "#D0BCD4",
  },
  {
    id: "rodberg",
    label: "Rødberg",
    solid: "#A33B45",
    mid: "#C15A63",
    soft: "#F4DCE0",
    wash: "#FAF0F1",
    onSolid: "#FFFFFF",
    onSoft: "#5C2228",
    border: "#E4B8BD",
  },
  {
    id: "skjaer",
    label: "Skjær",
    solid: "#3D6B8A",
    mid: "#5A89A8",
    soft: "#D4E6F1",
    wash: "#EDF4F8",
    onSolid: "#FFFFFF",
    onSoft: "#1F3D50",
    border: "#B3CDDC",
  },
] as const;

const THEME_BY_ID = new Map<string, WorkspaceThemePalette>(
  WORKSPACE_THEMES.map((theme) => [theme.id, theme])
);

const THEME_BY_SOLID = new Map<string, WorkspaceThemePalette>(
  WORKSPACE_THEMES.map((theme) => [theme.solid.toUpperCase(), theme])
);

export const DEFAULT_WORKSPACE_THEME = WORKSPACE_THEMES[0];

export const DEFAULT_WORKSPACE_ACCENT = DEFAULT_WORKSPACE_THEME.id;

export function isWorkspaceAccent(value: string): boolean {
  const key = value.trim().toLowerCase();
  if (THEME_BY_ID.has(key)) {
    return true;
  }
  return HEX.test(value) && THEME_BY_SOLID.has(normalizeHex(value));
}

export function normalizeWorkspaceAccent(value: string): WorkspaceThemeId {
  return resolveWorkspaceTheme(value).id;
}

export function resolveWorkspaceTheme(
  stored: string | null | undefined
): WorkspaceThemePalette {
  if (!stored) {
    return DEFAULT_WORKSPACE_THEME;
  }

  const byId = THEME_BY_ID.get(stored.trim().toLowerCase());
  if (byId) {
    return byId;
  }

  if (HEX.test(stored)) {
    const bySolid = THEME_BY_SOLID.get(normalizeHex(stored));
    if (bySolid) {
      return bySolid;
    }
  }

  return DEFAULT_WORKSPACE_THEME;
}

export function resolveWorkspaceAccent(
  stored: string | null | undefined
): { hex: string; foreground: string } {
  const theme = resolveWorkspaceTheme(stored);
  return { hex: theme.solid, foreground: theme.onSolid };
}

export function workspaceThemeCssVars(
  theme: WorkspaceThemePalette
): CSSProperties {
  return {
    "--workspace-accent": theme.solid,
    "--workspace-accent-foreground": theme.onSolid,
    "--workspace-mid": theme.mid,
    "--workspace-soft": theme.soft,
    "--workspace-on-soft": theme.onSoft,
    "--workspace-wash": theme.wash,
    "--workspace-border": theme.border,
    "--primary": theme.solid,
    "--primary-foreground": theme.onSolid,
    "--ring": theme.solid,
    "--sidebar-primary": theme.solid,
    "--sidebar-accent": theme.soft,
    "--sidebar-accent-foreground": theme.onSoft,
    "--sidebar": `color-mix(in srgb, ${theme.wash} 72%, white)`,
    "--background": `color-mix(in srgb, ${theme.wash} 58%, #EEF1F4)`,
  } as CSSProperties;
}

function normalizeHex(hex: string): string {
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return hex.toUpperCase();
}
