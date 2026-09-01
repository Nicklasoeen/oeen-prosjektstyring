import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-card px-8 py-16 text-center ring-1 ring-foreground/8">
      <IslandMark />
      <h2 className="mt-6 font-heading text-section text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

function IslandMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 88 40"
      className="h-10 w-[5.5rem] text-[var(--workspace-accent)]"
    >
      <path
        d="M4 28h80"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 28c4-10 10-16 18-16s12 5 16 10c3-6 8-12 16-12 7 0 12 6 14 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="22" cy="12" r="2.25" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
}
