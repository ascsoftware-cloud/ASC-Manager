import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * A friendly "that did not work" message with a retry. It never shows raw
 * error text: say what happened in plain words, and offer the next step.
 */
export function ErrorPanel({
  title = "That did not load",
  detail = "Check your connection and try again. If it keeps happening, tell us and we will sort it out.",
  onRetry,
  retryLabel = "Try again",
  children,
  className,
  framed = true,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
  className?: string;
  framed?: boolean;
}) {
  const body = (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="type-section">{title}</p>
        <p className="type-small text-muted-foreground">{detail}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
        {children}
      </div>
    </div>
  );
  return framed ? <Surface>{body}</Surface> : body;
}
