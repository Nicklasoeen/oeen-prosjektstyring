import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Surface({
  children,
  className,
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(26,35,48,0.04)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
