import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StaffGate } from "@/components/staff-gate";
import { Field, PageHeader, Surface } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAction } from "@/lib/mutate";
import { useAscStore } from "@/lib/store";

export const Route = createFileRoute("/_app/admin")({
  component: () => (
    <StaffGate>
      <AdminPage />
    </StaffGate>
  ),
});

function AdminPage() {
  const users = useAscStore((s) => s.users);
  const clients = useAscStore((s) => s.clients);
  const inviteUser = useAscStore((s) => s.inviteUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await saveAction("Invite sent", () =>
      inviteUser({
        email: email.trim(),
        name: name.trim(),
        role: "operator",
        tenantId: null,
      }),
    );
    setBusy(false);
    setName("");
    setEmail("");
  }

  const operators = users.filter((u) => u.role === "operator");
  const clientsUsers = users.filter((u) => u.role === "client");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Admin"
        title="Admin"
        description="Staff accounts. Clients never see this page. No shared passwords."
      />
      <Surface>
        <div className="border-b border-border px-5 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            ASC staff
          </p>
        </div>
        {operators.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            No operator profiles yet. Run <code>npm run bootstrap:operators</code>{" "}
            once the Supabase project exists.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {operators.map((u) => (
              <li key={u.id} className="px-5 py-4">
                <p className="text-champagne">{u.name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <Surface>
        <div className="border-b border-border px-5 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Client logins
          </p>
        </div>
        {clientsUsers.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            Invite people from the Clients page after you create a tenant.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {clientsUsers.map((u) => {
              const client = clients.find((c) => c.id === u.clientId);
              return (
                <li key={u.id} className="px-5 py-4">
                  <p className="text-champagne">{u.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {u.email}
                    {client ? ` · ${client.name}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>

      <Surface className="p-5">
        <h2 className="font-display text-xl text-champagne">Invite staff</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          They set their own password from the email. Do not invent logins in
          the repo.
        </p>
        <form onSubmit={(e) => void invite(e)} className="mt-5 grid gap-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={busy} className="w-fit rounded-full">
            Send invite
          </Button>
        </form>
      </Surface>
    </div>
  );
}
