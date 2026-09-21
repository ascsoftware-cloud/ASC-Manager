import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AscLockup } from "@/components/logo";
import { getSupabase } from "@/lib/supabase/client";
import { useAscStore } from "@/lib/store";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    async function run() {
      const sb = getSupabase();
      if (!sb) {
        setError("Database is not configured.");
        return;
      }

      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hash.get("error_description") || hash.get("error");
      if (hashError) {
        if (!cancelled) {
          setError(decodeURIComponent(hashError).replace(/\+/g, " "));
        }
        return;
      }

      const code = url.searchParams.get("code");
      const type =
        url.searchParams.get("type") || hash.get("type") || "";
      let needsPassword =
        type === "invite" || type === "recovery" || type === "signup";

      const authListener = sb.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") needsPassword = true;
      });
      subscription = authListener.data.subscription;

      if (code) {
        const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) setError("That link is invalid or has expired.");
          return;
        }
        // Invite + recovery both arrive as ?code=; type is often omitted.
        needsPassword = true;
      } else {
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: sessionError } = await sb.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            if (!cancelled) setError("That link is invalid or has expired.");
            return;
          }
        }
      }
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        if (!cancelled) setError("That link is invalid or has expired.");
        return;
      }

      window.history.replaceState({}, "", "/auth/callback");
      if (!needsPassword) {
        await useAscStore.getState().hydrateFromSession();
      }
      if (!cancelled) {
        void navigate({ to: needsPassword ? "/set-password" : "/" });
      }
    }
    void run();
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <AscLockup />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald">
          Signing you in
        </p>
      )}
    </main>
  );
}
