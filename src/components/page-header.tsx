import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Page title, optional one-line description, and the page's main action. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow && eyebrow !== title ? <p className="type-label">{eyebrow}</p> : null}
        <h1 className="type-title">{title}</h1>
        {description ? (
          <p className="type-body max-w-2xl text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="type-small font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="type-small text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function NativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "type-body flex h-11 w-full rounded-lg border border-input bg-card px-3 text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
