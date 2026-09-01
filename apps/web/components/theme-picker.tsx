"use client";

import { cn } from "@/lib/utils";
import {
  type WorkspaceThemeId,
  WORKSPACE_THEMES,
} from "@/lib/workspace-accent";

export function ThemePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (id: WorkspaceThemeId) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium">Tema</legend>
      <p className="text-sm text-muted-foreground">
        Temaet farger fremdrift, merker og små detaljer. Knapper og bakgrunn
        holder seg nøytrale.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {WORKSPACE_THEMES.map((option) => {
          const selected = option.id === value;
          return (
            <label
              key={option.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card p-2.5 transition-shadow",
                disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                selected
                  ? "border-transparent"
                  : "border-border hover:border-foreground/15"
              )}
              style={
                selected
                  ? { boxShadow: `0 0 0 2px ${option.solid}` }
                  : undefined
              }
            >
              <input
                type="radio"
                name="color_accent"
                value={option.id}
                checked={selected}
                disabled={disabled}
                onChange={() => {
                  onChange(option.id);
                }}
                className="sr-only"
              />
              <span className="flex h-7 overflow-hidden rounded-md">
                <span
                  className="w-[28%]"
                  style={{ backgroundColor: option.wash }}
                />
                <span
                  className="w-[28%]"
                  style={{ backgroundColor: option.soft }}
                />
                <span
                  className="w-[22%]"
                  style={{ backgroundColor: option.mid }}
                />
                <span
                  className="flex-1"
                  style={{ backgroundColor: option.solid }}
                />
              </span>
              <span className="mt-2 block text-sm font-medium">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
