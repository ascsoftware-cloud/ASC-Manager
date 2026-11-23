import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * An empty list or page: an icon, one sentence, and at most one action.
 * Pass `framed` when it stands alone rather than inside a Surface.
 */
export function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
  className,
  framed = false,
}: {
  icon?: LucideIcon;
  title: string;
  detail?: string;
  action?: ReactNode;
  className?: string;
  framed?: boolean;
}) {
  const body = (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <div className="max-w-sm space-y-1">
        <p className="type-section">{title}</p>
        {detail ? <p className="type-small text-muted-foreground">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
  return framed ? <Surface>{body}</Surface> : body;
}
