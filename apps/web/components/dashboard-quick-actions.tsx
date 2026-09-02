import Link from "next/link";
import { ClipboardList, FolderPlus, ListPlus, Timer } from "lucide-react";
import type { ReactNode } from "react";

import { surfaceClass } from "@/components/surface";
import { cn } from "@/lib/utils";

const tileClass = cn(
  surfaceClass,
  "group flex w-full items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(26,35,48,0.09)]"
);

export function DashboardQuickActions({ slug }: { slug: string }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Link href={`/w/${slug}/projects#nytt`} className={tileClass}>
        <TileIcon>
          <FolderPlus className="size-4" />
        </TileIcon>
        <TileText title="Nytt prosjekt" sub="Sett i gang noe nytt" />
      </Link>
      <Link href={`/w/${slug}/projects`} className={tileClass}>
        <TileIcon>
          <ListPlus className="size-4" />
        </TileIcon>
        <TileText title="Ny oppgave" sub="Velg prosjekt og legg til" />
      </Link>
      <Link href={`/w/${slug}/timeoversikt`} className={tileClass}>
        <TileIcon accent>
          <Timer className="size-4" />
        </TileIcon>
        <TileText title="Timeoversikt" sub="Timer mot estimat" />
      </Link>
      <Link href={`/w/${slug}/sjekklister`} className={tileClass}>
        <TileIcon accent>
          <ClipboardList className="size-4" />
        </TileIcon>
        <TileText title="Sjekklister" sub="Åpne punkter per prosjekt" />
      </Link>
    </section>
  );
}

function TileIcon({
  accent = false,
  children,
}: {
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
        accent
          ? "bg-workspace-soft text-workspace-on-soft"
          : "bg-workspace-wash text-workspace-accent"
      )}
    >
      {children}
    </span>
  );
}

function TileText({ title, sub }: { title: string; sub: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-heading text-sm font-semibold">
        {title}
      </span>
      <span className="mt-0.5 block truncate text-label text-muted-foreground">
        {sub}
      </span>
    </span>
  );
}
