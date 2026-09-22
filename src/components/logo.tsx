import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/asc-logo.webp";

export function AscMark({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      draggable={false}
      className={cn("h-10 w-auto", className)}
    />
  );
}

export function AscLockup({
  to = "/",
  className,
  size = "sm",
}: {
  to?: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <Link
      to={to}
      aria-label="ASC Manager"
      className={cn("flex items-center gap-2.5 text-champagne", className)}
    >
      <img
        src={LOGO_SRC}
        alt=""
        draggable={false}
        className={cn("w-auto", size === "lg" ? "h-14" : "h-8 sm:h-9")}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "uppercase tracking-[0.2em] text-gold",
            size === "lg" ? "text-[11px]" : "text-[9px] sm:text-[10px]",
          )}
        >
          Software
        </span>
        <span
          className={cn(
            "mt-0.5 uppercase tracking-[0.2em] text-muted-foreground",
            size === "lg" ? "text-[11px]" : "text-[9px] sm:text-[10px]",
          )}
        >
          Manager
        </span>
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
          <div className="text-[11px] uppercase tracking-[0.16em] text-gold">Software</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Manager
          </div>
        </div>
      ) : null}
    </div>
  );
}
