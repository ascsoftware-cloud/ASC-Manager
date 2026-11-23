import { type FormEvent, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AscLockup } from "@/components/logo";
import { Field } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <h1 className="type-title mt-10">Set your password</h1>
        <p className="type-body mt-2 text-muted-foreground">
          Choose a password for your account. Keep it to yourself.
        </p>
        {error ? (
          <p role="alert" className="type-small mt-4 text-destructive">
            {error}
          </p>
        ) : null}
        {ready ? (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-8 flex flex-col gap-5">
            <Field label="New password">
              <Input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm password">
              <Input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? "Saving…" : "Save password"}
            </Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
