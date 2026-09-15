import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

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
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-4xl font-medium tracking-tight text-champagne sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
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
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground/80">{hint}</span> : null}
    </label>
  );
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("border border-border bg-card/80", className)}
    >
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-10">
      <h2 className="font-display text-xl text-champagne">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
      {action}
    </div>
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
        "flex h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm text-foreground focus-visible:border-emerald focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Kpi({
  label,
  value,
  hint,
  accent,
  valueClass,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={cn(
        "border border-border bg-card px-5 py-4",
        accent && "border-l-2 border-l-emerald",
      )}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 font-display text-4xl", valueClass ?? "text-champagne")}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
