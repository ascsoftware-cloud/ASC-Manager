import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A section title with an optional detail line and action. Pass `inset` when
 * it sits at the top of a Surface: it gets the padding and a divider.
 */
export function SectionHeader({
  title,
  detail,
  action,
  inset = false,
  className,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  inset?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        inset && "border-b border-border px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="type-section">{title}</h2>
        {detail ? <p className="type-small text-muted-foreground">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}
