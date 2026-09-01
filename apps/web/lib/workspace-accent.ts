export type WorkspaceType = "student" | "enk" | "job";

const WORKSPACE_TYPES = ["student", "enk", "job"] as const;

export function isWorkspaceType(value: string): value is WorkspaceType {
  return (WORKSPACE_TYPES as readonly string[]).includes(value);
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const WORKSPACE_ACCENT_OPTIONS = [
  { hex: "#2F6F62", label: "Tang" },
  { hex: "#B56A32", label: "Rav" },
  { hex: "#2C4A6E", label: "Fjord" },
  { hex: "#6B4E71", label: "Lyng" },
  { hex: "#A33B45", label: "Rødberg" },
  { hex: "#3D6B8A", label: "Skjær" },
] as const;

export type WorkspaceAccentHex = (typeof WORKSPACE_ACCENT_OPTIONS)[number]["hex"];

const ACCENT_HEXES = new Set<string>(
  WORKSPACE_ACCENT_OPTIONS.map((option) => option.hex)
);

const FALLBACK_BY_TYPE: Record<WorkspaceType, WorkspaceAccentHex> = {
  student: "#2F6F62",
  enk: "#B56A32",
  job: "#2C4A6E",
};

export function defaultAccentForType(type: WorkspaceType): WorkspaceAccentHex {
  return FALLBACK_BY_TYPE[type];
}

export function isWorkspaceAccent(value: string): value is WorkspaceAccentHex {
  return ACCENT_HEXES.has(value.toUpperCase());
}

export function resolveWorkspaceAccent(
  stored: string | null | undefined,
  type: WorkspaceType
): { hex: string; foreground: string } {
  const hex = stored && HEX.test(stored) ? normalizeHex(stored) : FALLBACK_BY_TYPE[type];
  return { hex, foreground: contrastForeground(hex) };
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

function contrastForeground(hex: string): string {
  const { r, g, b } = parseHex(hex);
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.55 ? "#1A2330" : "#FFFFFF";
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const value = normalizeHex(hex).slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
