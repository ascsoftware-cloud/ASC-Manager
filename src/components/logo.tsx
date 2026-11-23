import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const EMERALD = "#0b3d2e";
const CREAM = "#f4ecd6";
const RING = "#e2d8bd";
const CHAMPAGNE = "#c8ad72";

/**
 * The official ASC mark: a dark emerald disc, serif "ASC", a champagne rule,
 * "SOFTWARE" in spaced caps, inside a thin cream ring with four champagne dots.
 * Drawn as SVG so it stays sharp at every size.
 */
export function AscLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label="ASC Software"
      className={cn("size-10 shrink-0", className)}
    >
      <circle cx="60" cy="60" r="57" fill="none" stroke={RING} strokeWidth="1.5" />
      <circle cx="60" cy="60" r="50" fill={EMERALD} />
      <g fill={CHAMPAGNE}>
        <circle cx="60" cy="3" r="2.4" />
        <circle cx="117" cy="60" r="2.4" />
        <circle cx="60" cy="117" r="2.4" />
        <circle cx="3" cy="60" r="2.4" />
      </g>
      <text
        x="60"
        y="62"
        textAnchor="middle"
        fill={CREAM}
        fontFamily="Fraunces, 'Times New Roman', serif"
        fontSize="33"
        fontWeight="500"
        letterSpacing="-0.5"
      >
        ASC
      </text>
      <line x1="38" y1="70" x2="82" y2="70" stroke={CHAMPAGNE} strokeWidth="1.2" />
      <text
        x="60"
        y="83"
        textAnchor="middle"
        fill={CHAMPAGNE}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="7"
        fontWeight="600"
        letterSpacing="2.6"
      >
        SOFTWARE
      </text>
    </svg>
  );
}

/** The mark with the product name beside it, linking home. */
export function AscLockup({
  to = "/",
  className,
  caption,
}: {
  to?: string;
  className?: string;
  /** A small line under the name, for example "Staff console". */
  caption?: string;
}) {
  return (
    <Link
      to={to}
      aria-label="ASC Manager, home"
      className={cn("flex items-center gap-3 rounded-lg text-foreground", className)}
    >
      <AscLogo className="size-10" />
      <span className="flex flex-col leading-tight">
        <span className="type-section">ASC Manager</span>
        {caption ? <span className="type-small text-muted-foreground">{caption}</span> : null}
      </span>
    </Link>
  );
}
