"use client";

import { useRouter } from "next/navigation";

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
        <Button type="button" variant="outline">
          {current?.name ?? "Workspace"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => {
              router.push(`/w/${workspace.slug}/dashboard`);
            }}
          >
            {workspace.name}
            {workspace.slug === currentSlug ? " · aktiv" : ""}
          </DropdownMenuItem>
        ))}
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
