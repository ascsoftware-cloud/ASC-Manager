import type { ErrorComponentProps } from "@tanstack/react-router";
import { ErrorPanel } from "@/components/error-panel";

/**
 * The page-level error screen. The real error goes to the console for us;
 * the person sees a plain message and a way to try again.
 */
export function AppErrorComponent({ error }: ErrorComponentProps) {
  if (typeof console !== "undefined") console.error(error);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md">
        <ErrorPanel
          title="Something went wrong"
          detail="That page did not load. Try again, and if it keeps happening, email us."
          onRetry={() => window.location.reload()}
          retryLabel="Reload the page"
        />
      </div>
    </main>
  );
}
