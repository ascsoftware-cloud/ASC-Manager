import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** A keyboard key hint, for example `<Kbd>Ctrl</Kbd><Kbd>K</Kbd>`. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1 font-sans text-xs font-medium leading-none text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
