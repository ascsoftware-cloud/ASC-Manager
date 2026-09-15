import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function AscMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-10", className)}
      aria-hidden="true"
    >
      <rect
        x="10"
        y="10"
        width="36"
        height="36"
        transform="rotate(12 28 28)"
        fill="none"
        className="stroke-emerald/40"
        strokeWidth="1.4"
      />
      <rect
        x="14"
        y="14"
        width="32"
        height="32"
        transform="rotate(-8 30 30)"
        fill="none"
        className="stroke-emerald/25"
        strokeWidth="1.2"
      />
      <rect
        x="20"
        y="20"
        width="24"
        height="24"
        transform="rotate(20 32 32)"
        className="fill-emerald"
      />
    </svg>
  );
}

export function AscLockup({
  to = "/",
  className,
}: {
  to?: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn("flex items-center gap-2 text-champagne", className)}
    >
      <span className="font-display text-xl tracking-tight">ASC</span>
      <span className="text-muted-foreground/50">|</span>
      <span className="text-[10px] uppercase tracking-[0.22em] text-gold">
        Software
      </span>
      <span className="text-muted-foreground/50">|</span>
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Manager
      </span>
    </Link>
  );
}

export function AscWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <AscMark />
      {!compact ? (
        <div className="leading-tight">
          <div className="font-display text-lg text-champagne">ASC</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Manager
          </div>
        </div>
      ) : null}
    </div>
  );
}
