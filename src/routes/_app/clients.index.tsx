import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Field, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { formatDay, formatRelative } from "@/lib/format";
import { DESK_MODULE_TOGGLES, WEBSITE_MODULE_TOGGLES } from "@/lib/modules";
import { saveAction } from "@/lib/mutate";
import { useAscStore } from "@/lib/store";
import type { Client } from "@/lib/types";

export const Route = createFileRoute("/_app/clients/")({
  component: ClientsPage,
});

const ALL_MODULES = [...DESK_MODULE_TOGGLES, ...WEBSITE_MODULE_TOGGLES];

function enabledModules(c: Client) {
  return ALL_MODULES.filter((m) => c.modules[m.key]);
}

function ClientsPage() {
  const clients = useAscStore((s) => s.clients);
  const sites = useAscStore((s) => s.sites);
  const renewals = useAscStore((s) => s.renewals);
  const log = useAscStore((s) => s.log);
  const addClient = useAscStore((s) => s.addClient);
  const [open, setOpen] = useState(false);

  const nextRenewal = (c: Client) =>
    renewals
      .filter((r) => r.clientId === c.id)
      .map((r) => r.expiresAt)
      .sort()[0];
  const lastActivity = (c: Client) =>
    log
      .filter((l) => l.clientId === c.id)
      .map((l) => l.at)
      .sort()
      .at(-1);
  const siteCount = (c: Client) => sites.filter((s) => s.clientId === c.id).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Everyone we run a site for. Open a client to manage their modules, logins and sites."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New client
          </Button>
        }
      />
      <DataTable
        label="Clients"
        rows={clients}
        getRowId={(c) => c.id}
        searchText={(c) => `${c.name} ${c.city} ${c.contactName}`}
        searchPlaceholder="Search clients"
        filters={[
          {
            id: "status",
            label: "All statuses",
            options: [
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
            ],
            match: (c, v) => c.status === v,
          },
          {
            id: "module",
            label: "Any module",
            options: ALL_MODULES.map((m) => ({ value: m.key, label: m.label })),
            match: (c, v) => c.modules[v as keyof Client["modules"]],
          },
        ]}
        initialSort={{ id: "name", dir: "asc" }}
        empty={{
          icon: Building2,
          title: "No clients yet",
          detail: "Create a client and we will email them an invite.",
          action: (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              New client
            </Button>
          ),
        }}
        columns={[
          {
            id: "name",
            header: "Client",
            sort: (a, b) => a.name.localeCompare(b.name),
            cell: (c) => (
              <Link
                to="/clients/$clientId"
                params={{ clientId: c.id }}
                search={{ tab: "overview" }}
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                {c.name}
              </Link>
            ),
          },
          {
            id: "city",
            header: "City",
            hideBelow: "md",
            sort: (a, b) => a.city.localeCompare(b.city),
            cell: (c) => c.city || "—",
          },
          {
            id: "modules",
            header: "Modules",
            hideBelow: "lg",
            cell: (c) => {
              const on = enabledModules(c);
              if (on.length === 0) return <span className="text-muted-foreground">None</span>;
              return (
                <span className="flex flex-wrap gap-1">
                  {on.slice(0, 3).map((m) => (
                    <Badge key={m.key} variant="muted">
                      {m.label}
                    </Badge>
                  ))}
                  {on.length > 3 ? <Badge variant="outline">+{on.length - 3}</Badge> : null}
                </span>
              );
            },
          },
          {
            id: "sites",
            header: "Sites",
            hideBelow: "sm",
            sort: (a, b) => siteCount(a) - siteCount(b),
            cell: (c) => siteCount(c),
          },
          {
            id: "renewal",
            header: "Next renewal",
            hideBelow: "lg",
            sort: (a, b) => (nextRenewal(a) ?? "9999").localeCompare(nextRenewal(b) ?? "9999"),
            cell: (c) => {
              const d = nextRenewal(c);
              return d ? formatDay(d) : <span className="text-muted-foreground">None</span>;
            },
          },
          {
            id: "activity",
            header: "Last activity",
            hideBelow: "md",
            sort: (a, b) => (lastActivity(a) ?? "").localeCompare(lastActivity(b) ?? ""),
            cell: (c) => {
              const d = lastActivity(c);
              return d ? formatRelative(d) : <span className="text-muted-foreground">None yet</span>;
            },
          },
          {
            id: "status",
            header: "Status",
            cell: (c) => <StatusBadge status={c.status} />,
          },
        ]}
      />

      <NewClientDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={async (input) => {
          const ok = await saveAction(`${input.name} added. Invite sent to ${input.email}.`, () =>
            addClient(input),
          );
          if (ok) setOpen(false);
        }}
      />
    </div>
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

