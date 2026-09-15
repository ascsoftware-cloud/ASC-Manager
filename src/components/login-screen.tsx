import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AscLockup, AscMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAscStore } from "@/lib/store";

export function LoginScreen() {
  const signIn = useAscStore((s) => s.signIn);
  const requestPasswordReset = useAscStore((s) => s.requestPasswordReset);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (resetMode) {
        await requestPasswordReset(email);
        setNotice("If that email is on the books, we sent a reset link.");
        return;
      }
      const result = await signIn(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      void navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(800px 520px at 20% 40%, rgb(62 207 142 / 0.16), transparent 60%)",
          }}
        />
        <AscLockup to="/" />
        <div className="relative max-w-md">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald">
            Client and system management
          </p>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] text-champagne">
            Every site we
            <br />
            run, <em className="italic text-emerald">on one</em>
            <br />
            page.
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Uptime, certificates, renewals and the parts of a site a client may
            change. Signed in, you see your own and nothing else.
          </p>
          <div className="mt-10">
            <AscMark className="size-24" />
          </div>
        </div>
        <p className="relative text-[11px] uppercase tracking-[0.18em] text-gold">
          Atlas Scale Collective (Pty) Ltd · Pretoria
        </p>
      </section>

      <section className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mb-10 lg:hidden">
          <AscLockup />
        </div>
        <div className="mx-auto w-full max-w-sm">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald">
            Manager
          </p>
          <h2 className="mt-3 font-display text-4xl text-champagne">
            {resetMode ? "Reset password" : "Sign in"}
          </h2>
          <form onSubmit={(e) => void onSubmit(e)} className="mt-10 flex flex-col gap-8">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Email address
              </span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 h-11 w-full border-0 border-b border-emerald bg-transparent text-sm text-champagne placeholder:text-muted-foreground/50 focus-visible:outline-none"
              />
            </label>
            {resetMode ? null : (
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Password
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-3 h-11 w-full border-0 border-b border-emerald bg-transparent text-sm text-champagne focus-visible:outline-none"
                />
              </label>
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {notice ? <p className="text-sm text-emerald">{notice}</p> : null}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full text-sm">
              {busy ? "Please wait" : resetMode ? "Send reset link" : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 text-left text-sm text-emerald hover:underline"
            onClick={() => {
              setResetMode((v) => !v);
              setError("");
              setNotice("");
            }}
          >
            {resetMode ? "Back to sign in" : "Forgot password?"}
          </button>
          <p className="mt-8 text-sm text-muted-foreground">
            Accounts are invite-only. Trouble signing in? Contact ASC at{" "}
            <a
              className="text-emerald hover:underline"
              href="mailto:admin@ascsoftware.co.za"
            >
              admin@ascsoftware.co.za
            </a>
            .
          </p>
          <div className="mt-6 flex gap-4 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-champagne">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-champagne">
              Terms
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
