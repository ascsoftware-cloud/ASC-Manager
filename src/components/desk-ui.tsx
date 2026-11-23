import { GripVertical } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
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
  if (live && stock === 0) return <StatusBadge tone="warn" label="0 left" />;
  return <StatusBadge status={live ? "live" : "hidden"} />;
}
