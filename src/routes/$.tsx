import { createFileRoute, Link } from "@tanstack/react-router";
import { AscLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/$")({
  component: NotFound,
});

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <AscLogo className="size-16" />
      <h1 className="type-title">We could not find that page</h1>
      <p className="type-body max-w-sm text-muted-foreground">
        The link may be old or mistyped. Head back to your overview.
      </p>
      <Button asChild>
        <Link to="/">Back to overview</Link>
      </Button>
    </main>
  );
}
