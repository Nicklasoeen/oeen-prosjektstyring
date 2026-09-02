import { Timer } from "lucide-react";

import { Surface } from "@/components/surface";
import { formatDueDateNb, formatLoggedDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export type WeekHourDay = {
  date: string;
  label: string;
  seconds: number;
  isToday: boolean;
};

export function WeekHoursChart({
  days,
  totalSeconds,
}: {
  days: WeekHourDay[];
  totalSeconds: number;
}) {
  const peakSeconds = Math.max(
    8 * 3600,
    ...days.map((day) => day.seconds),
    1800
  );
  const fromLabel = days[0] ? formatDueDateNb(days[0].date) : "";
  const toLabel = days[6] ? formatDueDateNb(days[6].date) : "";

  return (
    <Surface className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-section">Timer denne uken</h2>
        <p className="font-mono text-label text-muted-foreground">
          {fromLabel && toLabel ? `${fromLabel} – ${toLabel}` : null}
          {totalSeconds > 0
            ? ` · ${formatLoggedDuration(totalSeconds)}`
            : null}
        </p>
      </div>

      {totalSeconds === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/50 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-workspace-wash text-workspace-accent">
            <Timer className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            Ingen timer ført denne uken ennå. Start en timer på et prosjekt,
            så lander timene her.
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex h-44 items-end gap-2 sm:gap-3">
            {days.map((day) => {
              const heightPct = Math.max((day.seconds / peakSeconds) * 100, 0);
              return (
                <div
                  key={day.date}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2"
                >
                  <p
                    className={cn(
                      "font-mono text-[0.65rem] tabular-nums sm:text-label",
                      day.isToday
                        ? "font-medium text-workspace-accent"
                        : "text-muted-foreground",
                      day.seconds === 0 && "opacity-0"
                    )}
                  >
                    {formatLoggedDuration(day.seconds)}
                  </p>
                  <div className="flex h-32 w-full items-end justify-center">
                    <div
                      className="relative w-full max-w-12 overflow-hidden rounded-t-lg bg-workspace-wash sm:max-w-14"
                      style={{ height: "100%" }}
                    >
                      <div
                        title={`${day.label}: ${formatLoggedDuration(day.seconds)}`}
                        className={cn(
                          "absolute inset-x-0 bottom-0 rounded-t-lg",
                          day.isToday
                            ? "bg-workspace-accent"
                            : "bg-gradient-to-t from-workspace-accent to-workspace-mid"
                        )}
                        style={{
                          height: `${heightPct}%`,
                          minHeight: day.seconds > 0 ? "6px" : "0px",
                        }}
                      />
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-label",
                      day.isToday
                        ? "font-semibold text-workspace-accent"
                        : "text-muted-foreground"
                    )}
                  >
                    {day.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Surface>
  );
}
