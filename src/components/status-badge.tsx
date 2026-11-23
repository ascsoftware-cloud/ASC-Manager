import { cn } from "@/lib/utils";

type Tone = "good" | "warn" | "bad" | "neutral";

const TONES: Record<Tone, { chip: string; dot: string }> = {
  good: { chip: "bg-success/10", dot: "bg-success" },
  warn: { chip: "bg-warn/15", dot: "bg-warn" },
  bad: { chip: "bg-destructive/10", dot: "bg-destructive" },
  neutral: { chip: "bg-muted", dot: "bg-muted-foreground" },
};

export type StatusKey =
  | "up"
  | "down"
  | "unchecked"
  | "open"
  | "done"
  | "resolved"
  | "active"
  | "paused"
  | "read"
  | "hidden"
  | "live"
  | "invited"
  | "due"
  | "paid"
  | "new";

const STATUS: Record<StatusKey, { label: string; tone: Tone }> = {
  up: { label: "Up", tone: "good" },
  down: { label: "Down", tone: "bad" },
  unchecked: { label: "Not checked", tone: "neutral" },
  open: { label: "Open", tone: "warn" },
  new: { label: "New", tone: "warn" },
  read: { label: "Read", tone: "neutral" },
  done: { label: "Done", tone: "good" },
  resolved: { label: "Resolved", tone: "good" },
  active: { label: "Active", tone: "good" },
  live: { label: "Live", tone: "good" },
  paused: { label: "Paused", tone: "warn" },
  hidden: { label: "Hidden", tone: "neutral" },
  invited: { label: "Invited", tone: "warn" },
  due: { label: "Due", tone: "warn" },
  paid: { label: "Paid", tone: "good" },
};

/**
 * A status pill: a dot for the meaning, dark text on a tint for the words.
 * Pass a known `status`, or your own `label` and `tone`.
 */
export function StatusBadge({
  status,
  label,
  tone,
  className,
}: {
  status?: StatusKey;
  label?: string;
  tone?: Tone;
  className?: string;
}) {
  const known = status ? STATUS[status] : undefined;
  const classes = TONES[tone ?? known?.tone ?? "neutral"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 text-foreground",
        classes.chip,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", classes.dot)} />
      {label ?? known?.label ?? ""}
    </span>
  );
}

/** Plain secondary text for a type column, such as "Domain" or "Hosting". */
export function TypeLabel({ children }: { children: string }) {
  return <span className="type-small capitalize text-muted-foreground">{children}</span>;
}
