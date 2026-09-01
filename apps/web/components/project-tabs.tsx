import Link from "next/link";

import type { ProjectTab } from "@/lib/projects";
import { cn } from "@/lib/utils";

const TABS: Array<{ id: ProjectTab; label: string }> = [
  { id: "oversikt", label: "Oversikt" },
  { id: "oppgaver", label: "Oppgaver" },
  { id: "detaljer", label: "Detaljer" },
];

export function ProjectTabs({
  hrefBase,
  active,
}: {
  hrefBase: string;
  active: ProjectTab;
}) {
  return (
    <nav
      aria-label="Prosjektvisning"
      className="inline-flex rounded-xl bg-muted p-1"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={`${hrefBase}?tab=${tab.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-sm transition-shadow",
              isActive
                ? "bg-card font-medium text-foreground shadow-[0_1px_4px_rgba(26,35,48,0.08)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
