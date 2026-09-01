"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { useChatUi } from "@/components/chat-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ChatDock({ slug }: { slug: string }) {
  const { open, setOpen } = useChatUi();
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat?workspace=${encodeURIComponent(slug)}`,
        body: { workspaceSlug: slug },
      }),
    [slug]
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex h-[min(32rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgba(26,35,48,0.12)]">
      <div className="flex items-center justify-between border-b border-workspace-border bg-workspace-wash px-4 py-3">
        <p className="font-heading text-sm font-semibold">Chat</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(false)}
          aria-label="Lukk chat"
        >
          <X />
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-muted-foreground">
            Spør om prosjekter og oppgaver i dette workspace-et. Chat kan ikke
            endre noe ennå.
          </p>
        ) : null}
        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            <p className="text-label text-muted-foreground">
              {message.role === "user" ? "Du" : "Claude"}
            </p>
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <p
                  key={`${message.id}-${index}`}
                  className={cn(
                    "whitespace-pre-wrap rounded-xl px-3 py-2",
                    message.role === "user"
                      ? "bg-workspace-soft text-workspace-on-soft"
                      : "bg-muted"
                  )}
                >
                  {part.text}
                </p>
              ) : null
            )}
          </div>
        ))}
        {error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : null}
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const text = input.trim();
          if (!text || status === "streaming") {
            return;
          }
          void sendMessage({ text });
          setInput("");
        }}
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Skriv en melding…"
          className="h-9"
        />
        <Button type="submit" disabled={status === "streaming"}>
          Send
        </Button>
      </form>
    </div>
  );
}
