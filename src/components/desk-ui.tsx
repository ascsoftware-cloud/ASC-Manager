import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function GripHandle({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing",
        className,
      )}
      aria-label="Drag to reorder"
    >
      <GripVertical className="size-4" />
    </span>
  );
}

export function LivePill({ live, stock }: { live: boolean; stock?: number }) {
  if (live && stock === 0) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
        0 left
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.14em]",
        live ? "text-emerald" : "text-muted-foreground",
      )}
    >
      {live ? "Live" : "Hidden"}
    </span>
  );
}

export function EmptyDesk({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 border border-border bg-card px-5 py-12">
      <h2 className="font-display text-2xl text-champagne">{title}</h2>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{detail}</p>
      {action}
    </div>
  );
}
