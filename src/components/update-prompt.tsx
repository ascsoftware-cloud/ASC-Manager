import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * Installed (PWA) windows can sit open for days on an old build. This asks the
 * server which build is live and, when it differs from the one running here,
 * offers a one-tap reload.
 */
export function UpdatePrompt() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (__BUILD_ID__ === "dev") return;
    let stopped = false;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: string };
        if (!stopped && id && id !== __BUILD_ID__) setAvailable(true);
      } catch {
        // Offline or mid-deploy: try again on the next tick.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }

    void check();
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!available) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 p-3 sm:p-5">
      <div
        role="status"
        className="pointer-events-auto mx-auto flex max-w-md items-center gap-4 rounded-xl bg-card p-4 shadow-[var(--shadow-border),var(--shadow-lift)]"
      >
        <p className="flex-1 text-sm text-foreground">A new version of ASC Manager is ready.</p>
        <Button size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="size-4" aria-hidden />
          Update now
        </Button>
      </div>
    </div>
  );
}
