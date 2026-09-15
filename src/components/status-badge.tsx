import { cn } from "@/lib/utils";

export function StatusDot({
  status,
}: {
  status: "up" | "down" | "unchecked" | "open" | "done" | "resolved" | "active" | "paused" | "read" | "hidden" | "live";
}) {
  const map: Record<string, { label: string; className: string }> = {
    up: { label: "Up", className: "bg-emerald" },
    down: { label: "Down", className: "bg-destructive" },
    unchecked: { label: "Not checked", className: "bg-muted-foreground/50" },
    open: { label: "New", className: "bg-warn" },
    read: { label: "Read", className: "bg-muted-foreground/50" },
    done: { label: "Done", className: "bg-emerald" },
    resolved: { label: "Resolved", className: "bg-emerald" },
    active: { label: "Active", className: "bg-emerald" },
    live: { label: "Live", className: "bg-emerald" },
    paused: { label: "Paused", className: "bg-warn" },
    hidden: { label: "Hidden", className: "bg-muted-foreground/50" },
  };
  const item = map[status] ?? map.unchecked;
  return (
    <span className="inline-flex items-center gap-2 text-sm text-champagne">
      <span className={cn("size-2 rounded-full", item.className)} />
      {item.label}
    </span>
  );
}

export function TypeLabel({ children }: { children: string }) {
  return (
    <span className="text-sm capitalize text-muted-foreground">{children}</span>
  );
}
