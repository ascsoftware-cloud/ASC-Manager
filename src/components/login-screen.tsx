import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Field } from "@/components/page-header";
import { AscLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAscStore } from "@/lib/store";

const SUPPORT_EMAIL = "admin@ascsoftware.co.za";

export function LoginScreen() {
  const signIn = useAscStore((s) => s.signIn);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
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
      <section className="relative hidden overflow-hidden bg-brand text-brand-foreground lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <AscLogo className="size-20" />
        <div className="max-w-md">
          <p className="type-hero">Manage your ASC Software.</p>
          <div aria-hidden="true" className="mt-6 h-px w-16 bg-gold" />
          <p className="type-body mt-6 max-w-sm opacity-80">
            Your website, your enquiries and your account, all in one place.
          </p>
        </div>
        <p className="type-small opacity-70">Atlas Scale Collective (Pty) Ltd · Pretoria</p>
      </section>

      <section className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-12 lg:min-h-0">
        <div className="mb-8 flex justify-center lg:hidden">
          <AscLogo className="size-20" />
        </div>
        <div className="mx-auto w-full max-w-sm">
          <h1 className="type-title">Sign in</h1>
          <p className="type-body mt-2 text-muted-foreground">
            ASC Manager is invite only. Use the email address we invited.
          </p>
          <form onSubmit={(e) => void onSubmit(e)} className="mt-8 flex flex-col gap-5">
            <Field label="Email address">
              <Input
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error ? (
              <p role="alert" className="type-small text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="type-small mt-8 text-muted-foreground">
            Trouble signing in?{" "}
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <div className="type-small mt-4 flex gap-4 text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
