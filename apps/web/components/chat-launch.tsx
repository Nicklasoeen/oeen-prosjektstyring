"use client";

import Link from "next/link";

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
    <section className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/8 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-heading text-section">Chat</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasKey
            ? "Spør om arbeidet i dette workspace-et. Chat kan lese, men ikke endre."
            : "Legg inn Anthropic-nøkkelen din for å chatte om prosjekter og oppgaver."}
        </p>
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
    </section>
  );
}
