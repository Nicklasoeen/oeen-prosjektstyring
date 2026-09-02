import { addCalendarDays, osloStartOfDay } from "@/lib/format";

export type TimedEntry = {
  started_at: string;
  ended_at: string | null;
};

function entryBounds(
  startedAt: string,
  endedAt: string | null,
  nowMs: number
): { startMs: number; endMs: number } | null {
  const startMs = new Date(startedAt).getTime();
  const endMs = endedAt ? new Date(endedAt).getTime() : nowMs;
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return null;
  }
  return { startMs, endMs };
}

/** Live SUM of logged time on the given entries. Running rows count until now. */
export function loggedSeconds(entries: TimedEntry[], nowMs: number): number {
  let total = 0;
  for (const entry of entries) {
    const bounds = entryBounds(entry.started_at, entry.ended_at, nowMs);
    if (!bounds) {
      continue;
    }
    total += (bounds.endMs - bounds.startMs) / 1000;
  }
  return total;
}

/**
 * Splits logged time across Oslo calendar days. Entries that cross
 * midnight contribute to each day they overlap.
 */
export function loggedSecondsByDate(
  entries: TimedEntry[],
  dates: string[],
  nowMs: number
): number[] {
  const totals = dates.map(() => 0);
  if (dates.length === 0) {
    return totals;
  }

  const dayStarts = dates.map((date) => osloStartOfDay(date).getTime());
  const rangeStart = dayStarts[0];
  const rangeEnd = osloStartOfDay(
    addCalendarDays(dates[dates.length - 1], 1)
  ).getTime();

  for (const entry of entries) {
    const bounds = entryBounds(entry.started_at, entry.ended_at, nowMs);
    if (!bounds) {
      continue;
    }
    const startMs = Math.max(bounds.startMs, rangeStart);
    const endMs = Math.min(bounds.endMs, rangeEnd);
    if (endMs <= startMs) {
      continue;
    }
    for (let index = 0; index < dates.length; index += 1) {
      const dayStart = dayStarts[index];
      const dayEnd =
        index + 1 < dates.length ? dayStarts[index + 1] : rangeEnd;
      const overlap = Math.min(endMs, dayEnd) - Math.max(startMs, dayStart);
      if (overlap > 0) {
        totals[index] += overlap / 1000;
      }
    }
  }

  return totals;
}
