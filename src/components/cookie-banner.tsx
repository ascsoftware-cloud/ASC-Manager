import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAscStore } from "@/lib/store";

export function CookieBanner() {
  const accepted = useAscStore((s) => s.cookiesAccepted);
  const setCookies = useAscStore((s) => s.setCookies);
  if (accepted !== null) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 sm:p-5">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border),var(--shadow-lift)] sm:flex-row sm:items-center sm:gap-5">
        <p className="text-sm text-muted-foreground">
          Necessary cookies keep this panel working on this device. We do not
          load analytics until you accept.{" "}
          <Link to="/privacy" className="text-emerald underline-offset-4 hover:underline">
            Privacy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setCookies(false)}>
            Necessary only
          </Button>
          <Button size="sm" onClick={() => setCookies(true)}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
