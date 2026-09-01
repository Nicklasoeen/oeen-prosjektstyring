"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ChatUiValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ChatUiContext = createContext<ChatUiValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <ChatUiContext.Provider value={value}>{children}</ChatUiContext.Provider>
  );
}

export function useChatUi(): ChatUiValue {
  const value = useContext(ChatUiContext);
  if (!value) {
    throw new Error("useChatUi must be used within ChatProvider");
  }
  return value;
}
