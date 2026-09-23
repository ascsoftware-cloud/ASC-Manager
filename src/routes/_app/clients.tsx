import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { ConfirmDangerDialog } from "@/components/confirm-danger";
import { StaffGate } from "@/components/staff-gate";
import { Field, PageHeader, Surface } from "@/components/page-header";
import { StatusDot } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DESK_MODULE_TOGGLES, WEBSITE_MODULE_TOGGLES, type ModuleKey } from "@/lib/modules";
import { saveAction } from "@/lib/mutate";
import { useAscStore } from "@/lib/store";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/_app/clients")({
  component: () => (
    <StaffGate>
      <ClientsPage />
    </StaffGate>
  ),
});

function ClientsPage() {
  const clients = useAscStore((s) => s.clients);
  const sites = useAscStore((s) => s.sites);
  const users = useAscStore((s) => s.users);
  const addClient = useAscStore((s) => s.addClient);
  const removeClient = useAscStore((s) => s.removeClient);
  const inviteUser = useAscStore((s) => s.inviteUser);
  const [open, setOpen] = useState(false);
  const [inviteFor, setInviteFor] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [removeFor, setRemoveFor] = useState<{
    id: string;
    name: string;
    sites: number;
    logins: number;
  } | null>(null);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeader
        eyebrow="Clients"
        title="Clients"
        description="Desk modules (store, calendar, bookings, site media) and website extras (SEO, FAQ, testimonials, gallery, services, staff). Turn on only what that public site actually has."
        action={
          <Button className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New client
          </Button>
        }
      />
      <Surface>
        {clients.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            No clients yet. Create a tenant and invite their people. Sample names
            from the old preview are gone on purpose.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Sites</th>
                <th className="px-5 py-3 font-medium">Logins</th>
                {DESK_MODULE_TOGGLES.map((mod) => (
                  <th key={mod.key} className="px-5 py-3 font-medium" title={mod.title}>
                    {mod.label}
                  </th>
                ))}
                {WEBSITE_MODULE_TOGGLES.map((mod) => (
                  <th key={mod.key} className="px-5 py-3 font-medium" title={mod.title}>
                    {mod.label}
                  </th>
                ))}
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const logins = users.filter((u) => u.clientId === c.id);
                const n = sites.filter((s) => s.clientId === c.id).length;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">
                      <p className="text-champagne">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.city}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{c.contactName}</td>
                    <td className="px-5 py-4 text-muted-foreground">{n}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {logins.length === 0
                        ? "—"
                        : logins.map((u) => u.email).join(", ")}
                    </td>
                    {DESK_MODULE_TOGGLES.map((mod) => (
                      <td key={mod.key} className="px-5 py-4">
                        <ModuleSwitch client={c} moduleKey={mod.key} label={mod.label} />
                      </td>
                    ))}
                    {WEBSITE_MODULE_TOGGLES.map((mod) => (
                      <td key={mod.key} className="px-5 py-4">
                        <ModuleSwitch client={c} moduleKey={mod.key} label={mod.label} />
                      </td>
                    ))}
                    <td className="px-5 py-4">
                      <StatusDot status={c.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInviteFor({ id: c.id, name: c.name })}
                        >
                          Invite
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setRemoveFor({
                              id: c.id,
                              name: c.name,
                              sites: n,
                              logins: logins.length,
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Surface>

      <NewClientDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={async (input) => {
          const ok = await saveAction(
            `${input.name} added. Invite sent to ${input.email}.`,
            () => addClient(input),
          );
          if (ok) setOpen(false);
        }}
      />

      <InviteDialog
        target={inviteFor}
        onOpenChange={(v) => {
          if (!v) setInviteFor(null);
        }}
        onInvite={async (name, email) => {
          if (!inviteFor) return;
          const ok = await saveAction(`Invite sent to ${email}`, () =>
            inviteUser({
              email,
              name,
              role: "client",
              tenantId: inviteFor.id,
            }),
          );
          if (ok) setInviteFor(null);
        }}
      />

      <ConfirmDangerDialog
        open={Boolean(removeFor)}
        title={`Remove ${removeFor?.name ?? "this client"}?`}
        description={`This takes down their public sites (${removeFor?.sites ?? 0}), website content, and logins (${removeFor?.logins ?? 0}). They will not be able to sign in. This cannot be undone.`}
        confirmLabel="Remove client"
        onOpenChange={(v) => {
          if (!v) setRemoveFor(null);
        }}
        onConfirm={async () => {
          if (!removeFor) return;
          const ok = await saveAction(`${removeFor.name} removed`, () =>
            removeClient(removeFor.id),
          );
          if (ok) setRemoveFor(null);
        }}
      />
    </div>
  );
}

function ModuleSwitch({
  client,
  moduleKey,
  label,
}: {
  client: Client;
  moduleKey: ModuleKey;
  label: string;
}) {
  const updateClient = useAscStore((s) => s.updateClient);
  return (
    <Switch
      checked={client.modules[moduleKey]}
      onCheckedChange={(on) => {
        void saveAction(on ? `${label} on` : `${label} off`, () =>
          updateClient(client.id, {
            modules: { ...client.modules, [moduleKey]: on },
          }),
        );
      }}
      aria-label={`${label} for ${client.name}`}
    />
  );
}

function NewClientDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (input: {
    name: string;
    city: string;
    contactName: string;
    email: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onCreate({
      name: name.trim(),
      city: city.trim() || "Pretoria",
      contactName: contactName.trim(),
      email: email.trim(),
    });
    setBusy(false);
    setName("");
    setCity("");
    setContactName("");
    setEmail("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New client</DialogTitle>
            <DialogDescription>
              Creates the tenant and emails an invite. They set their own
              password. They will not see any other client.
            </DialogDescription>
          </DialogHeader>
          <Field label="Company">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Contact">
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
          </Field>
          <Field label="Login email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Create and invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  target,
  onOpenChange,
  onInvite,
}: {
  target: { id: string; name: string } | null;
  onOpenChange: (v: boolean) => void;
  onInvite: (name: string, email: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onInvite(name.trim(), email.trim());
    setBusy(false);
    setName("");
    setEmail("");
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Invite to {target?.name}</DialogTitle>
            <DialogDescription>
              They get an email, set a password, and only see this tenant.
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
