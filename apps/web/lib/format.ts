export function formatDateNb(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDueDateNb(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function isPastDate(value: string): boolean {
  const date = new Date(`${value}T23:59:59`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.getTime() < Date.now();
}

export function todayInOslo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });
}

export function formatRelativeNb(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) {
    return "nå";
  }
  if (minutes < 60) {
    return `${minutes} min siden`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} t siden`;
  }
  return formatDateNb(value);
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function formatElapsedClock(
  startedAt: string,
  now = Date.now()
): string {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) {
    return "0t 00m 00s";
  }
  const totalSeconds = Math.max(0, Math.floor((now - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}t ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatLoggedDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0 && minutes === 0) {
    return "0 t";
  }
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} t`;
  }
  return `${hours} t ${minutes} min`;
}
