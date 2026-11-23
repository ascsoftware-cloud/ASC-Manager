import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * A small label. The text is always the foreground colour on a tint, so every
 * variant clears WCAG AA; meaning is carried by the tint and a dot.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 text-foreground",
  {
    variants: {
      variant: {
        default: "bg-primary/10",
        muted: "bg-muted",
        live: "bg-success/10",
        staging: "bg-warn/15",
        paused: "bg-destructive/10",
        outline: "border border-border bg-card",
        /** Premium: a champagne tint and rule behind ink text. */
        premium: "border border-gold bg-gold-soft",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
