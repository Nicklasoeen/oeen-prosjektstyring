"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { useChatUi } from "@/components/chat-provider";
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
    <section className="flex flex-col gap-4 rounded-2xl border border-workspace-border bg-workspace-wash p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-workspace-soft text-workspace-on-soft">
          <MessageSquare className="size-4" />
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
        <Button
          type="button"
          className="rounded-xl"
          onClick={() => setOpen(true)}
        >
          Åpne chat
        </Button>
      ) : (
        <Button asChild className="rounded-xl">
          <Link href={`/w/${slug}/settings`}>Legg inn nøkkel</Link>
        </Button>
      )}
    </section>
  );
}
