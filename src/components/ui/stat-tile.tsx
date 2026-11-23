import type { ReactNode } from "react";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/** One figure with a label. Lay several out in a grid. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warn";
  icon?: ReactNode;
}) {
  return (
    <Surface className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="type-label">{label}</p>
        {icon ? <span className="text-muted-foreground [&_svg]:size-4">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "type-stat mt-2",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </p>
      {hint ? <p className="type-small mt-1 text-muted-foreground">{hint}</p> : null}
    </Surface>
  );
}
