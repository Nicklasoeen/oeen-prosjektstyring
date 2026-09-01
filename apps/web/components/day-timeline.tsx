import { Timer } from "lucide-react";

import { Surface } from "@/components/surface";
import { formatLoggedDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TimelineEntry = {
  id: string;
  taskId: string;
  taskTitle: string;
  startedAt: string;
  endedAt: string | null;
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

type Bar = {
  id: string;
  startMs: number;
  endMs: number;
  running: boolean;
};

type Row = {
  taskId: string;
  title: string;
  bars: Bar[];
  totalMs: number;
};

export function DayTimeline({
  entries,
  dayStartMs,
  nowMs,
}: {
  entries: TimelineEntry[];
  dayStartMs: number;
  nowMs: number;
}) {
  const dayEndMs = dayStartMs + DAY_MS;
  const clamp = (ms: number) => Math.min(Math.max(ms, dayStartMs), dayEndMs);

  const rowsByTask = new Map<string, Row>();
  let totalMs = 0;

  for (const entry of entries) {
    const rawStart = new Date(entry.startedAt).getTime();
    const rawEnd = entry.endedAt ? new Date(entry.endedAt).getTime() : nowMs;
    if (Number.isNaN(rawStart) || rawEnd <= rawStart) {
      continue;
    }
    const startMs = clamp(rawStart);
    const endMs = clamp(rawEnd);
    if (endMs <= startMs) {
      continue;
    }
    const row = rowsByTask.get(entry.taskId) ?? {
      taskId: entry.taskId,
      title: entry.taskTitle,
      bars: [],
      totalMs: 0,
    };
    row.bars.push({
      id: entry.id,
      startMs,
      endMs,
      running: entry.endedAt === null,
    });
    row.totalMs += endMs - startMs;
    totalMs += endMs - startMs;
    rowsByTask.set(entry.taskId, row);
  }

  const rows = [...rowsByTask.values()].sort(
    (a, b) => Math.min(...a.bars.map((bar) => bar.startMs)) -
      Math.min(...b.bars.map((bar) => bar.startMs))
  );

  // Default work-day window, widened to fit actual entries and "now".
  let startHour = 8;
  let endHour = 16;
  for (const row of rows) {
    for (const bar of row.bars) {
      startHour = Math.min(startHour, Math.floor((bar.startMs - dayStartMs) / HOUR_MS));
      endHour = Math.max(endHour, Math.ceil((bar.endMs - dayStartMs) / HOUR_MS));
    }
  }
  if (nowMs >= dayStartMs && nowMs <= dayEndMs) {
    endHour = Math.max(endHour, Math.min(24, Math.ceil((nowMs - dayStartMs) / HOUR_MS)));
  }
  startHour = Math.max(0, startHour);
  endHour = Math.min(24, Math.max(endHour, startHour + 1));

  const windowStartMs = dayStartMs + startHour * HOUR_MS;
  const windowEndMs = dayStartMs + endHour * HOUR_MS;
  const windowMs = windowEndMs - windowStartMs;
  const toPercent = (ms: number) => ((ms - windowStartMs) / windowMs) * 100;

  const tickStep = endHour - startHour > 10 ? 2 : 1;
  const ticks: number[] = [];
  for (let hour = startHour; hour <= endHour; hour += tickStep) {
    ticks.push(hour);
  }

  const showNowMarker = nowMs >= windowStartMs && nowMs <= windowEndMs;
  const nowPercent = toPercent(nowMs);

  return (
    <Surface className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-section">Dagens tidslinje</h2>
        {totalMs > 0 ? (
          <p className="font-mono text-label text-muted-foreground">
            {formatLoggedDuration(totalMs / 1000)} ført i dag
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/50 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-workspace-wash text-workspace-accent">
            <Timer className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            Ingen timer ført i dag ennå. Start en timer fra en oppgave, så
            tegnes dagen din her.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <div className="grid gap-1.5">
            {rows.map((row) => (
              <div key={row.taskId} className="flex items-center gap-3">
                <p
                  className="w-32 shrink-0 truncate text-sm text-foreground sm:w-40"
                  title={row.title}
                >
                  {row.title}
                </p>
                <div className="relative h-7 min-w-0 flex-1 overflow-hidden rounded-md bg-muted/50">
                  {row.bars.map((bar) => (
                    <div
                      key={bar.id}
                      title={`${formatClock(bar.startMs)}–${
                        bar.running ? "nå" : formatClock(bar.endMs)
                      } · ${formatLoggedDuration((bar.endMs - bar.startMs) / 1000)}`}
                      className={cn(
                        "absolute inset-y-1 rounded-[5px]",
                        bar.running
                          ? "bg-workspace-accent"
                          : "bg-workspace-accent/70"
                      )}
                      style={{
                        left: `${toPercent(bar.startMs)}%`,
                        width: `${Math.max(
                          toPercent(bar.endMs) - toPercent(bar.startMs),
                          0.75
                        )}%`,
                      }}
                    />
                  ))}
                  {showNowMarker ? (
                    <div
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-foreground/50"
                      style={{ left: `${nowPercent}%` }}
                    />
                  ) : null}
                </div>
                <p className="hidden w-16 shrink-0 text-right font-mono text-label tabular-nums text-muted-foreground sm:block">
                  {formatLoggedDuration(row.totalMs / 1000)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="w-32 shrink-0 sm:w-40" />
            <div className="relative h-4 min-w-0 flex-1">
              {ticks.map((hour) => (
                <span
                  key={hour}
                  className="absolute -translate-x-1/2 font-mono text-[0.65rem] text-muted-foreground/80"
                  style={{
                    left: `${((hour - startHour) / (endHour - startHour)) * 100}%`,
                  }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            <div className="hidden w-16 shrink-0 sm:block" />
          </div>
        </div>
      )}
    </Surface>
  );
}

function formatClock(ms: number): string {
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  }).format(new Date(ms));
}
