import { createFileRoute, Link } from "@tanstack/react-router";
import { AscMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/$")({
  component: NotFound,
});

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
      <AscMark className="size-12" />
      <p className="text-[11px] uppercase tracking-[0.18em] text-primary">404</p>
      <h1 className="font-display text-4xl text-champagne">No such page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That route is not in ASC Manager. Head back to the panel.
      </p>
      <Button asChild>
        <Link to="/">Overview</Link>
      </Button>
    </main>
  );
}
