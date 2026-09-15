import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AscLockup } from "@/components/logo";
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
      <section className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(720px 480px at 18% 42%, rgb(62 207 142 / 0.14), transparent 62%)",
          }}
        />
        <AscLockup to="/" />
        <div className="relative max-w-lg">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald">
            Atlas Scale Collective
          </p>
          <h1 className="mt-5 font-display text-[2.75rem] leading-[1.08] text-champagne xl:text-5xl">
            Manage your
            <br />
            ASC Software.
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            The control panel for every site we run. Staff see the full book.
            Clients sign in and only see their own.
          </p>
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
          <p className="mt-2 text-sm text-muted-foreground">
            {resetMode
              ? "We’ll email a link if this address has an account."
              : "Invite-only. Use the email ASC gave you."}
          </p>
          <form onSubmit={(e) => void onSubmit(e)} className="mt-10 flex flex-col gap-7">
            <label className="block" htmlFor="login-email">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Email address
              </span>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 h-11 w-full border-0 border-b border-emerald bg-transparent text-sm text-champagne placeholder:text-muted-foreground/50 focus-visible:border-champagne focus-visible:outline-none"
              />
            </label>
            {resetMode ? null : (
              <label className="block" htmlFor="login-password">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Password
                </span>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-3 h-11 w-full border-0 border-b border-emerald bg-transparent text-sm text-champagne focus-visible:border-champagne focus-visible:outline-none"
                />
              </label>
            )}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {notice ? <p className="text-sm text-emerald">{notice}</p> : null}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full text-sm">
              {busy ? "Please wait" : resetMode ? "Send reset link" : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 min-h-11 text-left text-sm text-emerald hover:underline"
            onClick={() => {
              setResetMode((v) => !v);
              setError("");
              setNotice("");
            }}
          >
            {resetMode ? "Back to sign in" : "Forgot password?"}
          </button>
          <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
            Trouble signing in?{" "}
            <a
              className="text-emerald hover:underline"
              href="mailto:admin@ascsoftware.co.za"
            >
              admin@ascsoftware.co.za
            </a>
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
