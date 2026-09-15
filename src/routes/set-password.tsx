import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AscLockup } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { useAscStore } from "@/lib/store";

export const Route = createFileRoute("/set-password")({
  component: SetPasswordPage,
});

async function waitForSession() {
  const sb = getSupabase();
  if (!sb) return null;
  for (let i = 0; i < 8; i++) {
    const { data } = await sb.auth.getSession();
    if (data.session) return data.session;
    await new Promise((r) => setTimeout(r, 150));
  }
  const { data } = await sb.auth.getUser();
  return data.user ? (await sb.auth.getSession()).data.session : null;
}

function SetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void waitForSession().then((session) => {
      if (!session) {
        setError("That link is invalid or has expired.");
        return;
      }
      setReady(true);
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError("");
    const { error: updateError } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Could not save that password.");
      return;
    }
    await useAscStore.getState().hydrateFromSession();
    void navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <AscLockup />
        <h1 className="mt-10 font-display text-4xl text-champagne">Set password</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Choose a password for this account. Do not share it.
        </p>
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        {ready ? (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-8 flex flex-col gap-8">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                New password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-3 h-11 w-full border-0 border-b border-emerald bg-transparent text-sm text-champagne focus-visible:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Confirm
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-3 h-11 w-full border-0 border-b border-emerald bg-transparent text-sm text-champagne focus-visible:outline-none"
              />
            </label>
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
              {busy ? "Saving" : "Save password"}
            </Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
