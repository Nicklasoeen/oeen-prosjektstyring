import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export const surfaceClass =
  "rounded-xl border border-black/[0.04] bg-card shadow-[0_4px_18px_rgba(26,35,48,0.05)]";

export function Surface({
  children,
  className,
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div className={cn(surfaceClass, className)} {...props}>
      {children}
    </div>
  );
}
