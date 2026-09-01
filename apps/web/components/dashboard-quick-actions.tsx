"use client";

import Link from "next/link";
import { FolderPlus, KeyRound, ListPlus, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";

import { useChatUi } from "@/components/chat-provider";
import { surfaceClass } from "@/components/surface";
import { cn } from "@/lib/utils";

const tileClass = cn(
  surfaceClass,
  "group flex w-full items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(26,35,48,0.09)]"
);

export function DashboardQuickActions({
  slug,
  hasKey,
}: {
  slug: string;
  hasKey: boolean;
}) {
  const { setOpen } = useChatUi();

  return (
    <section className="grid gap-3 sm:grid-cols-3">
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
      {hasKey ? (
        <button type="button" onClick={() => setOpen(true)} className={tileClass}>
          <TileIcon accent>
            <MessageSquare className="size-4" />
          </TileIcon>
          <TileText title="Spør assistenten" sub="Chat om arbeidet i workspace-et" />
        </button>
      ) : (
        <Link href={`/w/${slug}/settings`} className={tileClass}>
          <TileIcon accent>
            <KeyRound className="size-4" />
          </TileIcon>
          <TileText title="Aktiver chat" sub="Legg inn Anthropic-nøkkelen din" />
        </Link>
      )}
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
