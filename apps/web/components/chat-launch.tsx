"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { useChatUi } from "@/components/chat-provider";
import { Surface } from "@/components/surface";
import { Button } from "@/components/ui/button";

export function ChatLaunch({
  slug,
  hasKey,
}: {
  slug: string;
  hasKey: boolean;
}) {
  const { setOpen } = useChatUi();

  return (
    <Surface className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <MessageSquare className="size-4 text-workspace-accent" />
        </span>
        <div>
          <h2 className="font-heading text-section">Chat</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasKey
              ? "Spør om arbeidet i dette workspace-et. Chat kan lese, men ikke endre."
              : "Legg inn Anthropic-nøkkelen din for å chatte om prosjekter og oppgaver."}
          </p>
        </div>
      </div>
      {hasKey ? (
        <Button type="button" onClick={() => setOpen(true)}>
          Åpne chat
        </Button>
      ) : (
        <Button asChild>
          <Link href={`/w/${slug}/settings`}>Legg inn nøkkel</Link>
        </Button>
      )}
    </Surface>
  );
}
