"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { getRunningTimerAction } from "@/app/w/[workspace]/projects/actions";
import type { RunningTimer } from "@/lib/running-timer";

type RunningTimerContextValue = {
  timer: RunningTimer | null;
  refresh: () => Promise<void>;
};

const RunningTimerContext = createContext<RunningTimerContextValue | null>(
  null
);

export function RunningTimerProvider({
  initial,
  children,
}: {
  initial: RunningTimer | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [clientTimer, setClientTimer] = useState<
    RunningTimer | null | undefined
  >(undefined);
  const timer = clientTimer === undefined ? initial : clientTimer;

  const refresh = useCallback(async () => {
    const next = await getRunningTimerAction();
    setClientTimer(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getRunningTimerAction().then((next) => {
      if (!cancelled) {
        setClientTimer(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <RunningTimerContext.Provider value={{ timer, refresh }}>
      {children}
    </RunningTimerContext.Provider>
  );
}

export function useRunningTimer(): RunningTimerContextValue {
  const value = useContext(RunningTimerContext);
  if (!value) {
    throw new Error("useRunningTimer must be used within RunningTimerProvider");
  }
  return value;
}
