import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The one card: white on the canvas, a 1px border, radius 12 and a soft
 * shadow. Pages put content in a Surface instead of styling their own boxes.
 */
export function Surface({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-[var(--shadow-surface)]",
        className,
      )}
      {...props}
    />
  );
}
