"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";

import { AccentDot } from "@/components/accent-dot";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceSummary } from "@/lib/auth/workspace-access";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({
  workspaces,
  currentSlug,
}: {
  workspaces: WorkspaceSummary[];
  currentSlug: string;
}) {
  const router = useRouter();
  const current =
    workspaces.find((workspace) => workspace.slug === currentSlug) ??
    workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full justify-between gap-2 rounded-xl border-black/[0.04] bg-card px-3 py-2.5 text-left font-normal shadow-none"
        >
          <span className="flex min-w-0 items-center gap-2">
            {current ? <AccentDot accent={current.colorAccent} /> : null}
            <span className="min-w-0 truncate text-sm font-medium">
              {current?.name ?? "Workspace"}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((workspace) => {
          const active = workspace.slug === currentSlug;
          return (
            <DropdownMenuItem
              key={workspace.id}
              className="py-2"
              onSelect={() => {
                router.push(`/w/${workspace.slug}/dashboard`);
              }}
            >
              <AccentDot accent={workspace.colorAccent} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {workspace.name}
              </span>
              <Check
                className={cn(
                  "size-3.5 text-workspace-accent",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            router.push("/w/new");
          }}
        >
          Opprett workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
