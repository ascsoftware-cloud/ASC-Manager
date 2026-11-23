import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, UserPlus } from "lucide-react";
import { ConfirmDangerDialog } from "@/components/confirm-danger";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { StaffPlanCard } from "@/components/billing/staff-plan";
import { TeamManager } from "@/components/team-manager";
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
import { Surface } from "@/components/ui/surface";
import { Switch } from "@/components/ui/switch";
import { formatDay, formatRelative, formatZar } from "@/lib/format";
import { DESK_MODULE_TOGGLES, WEBSITE_MODULE_TOGGLES, type ModuleKey } from "@/lib/modules";
import { saveAction } from "@/lib/mutate";
import { useAscStore } from "@/lib/store";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "modules", label: "Modules" },
  { id: "logins", label: "Logins" },
  { id: "sites", label: "Sites" },
  { id: "billing", label: "Billing" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/_app/clients/$clientId")({
  validateSearch: (search: Record<string, unknown>): { tab: TabId } => ({
    tab: TABS.some((t) => t.id === search.tab) ? (search.tab as TabId) : "overview",
  }),
  component: ClientPage,
});

function ClientPage() {
  const { clientId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const client = useAscStore((s) => s.clients.find((c) => c.id === clientId));
  const sites = useAscStore((s) => s.sites);
  const users = useAscStore((s) => s.users);
  const removeClient = useAscStore((s) => s.removeClient);
  const inviteUser = useAscStore((s) => s.inviteUser);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const siteCount = sites.filter((x) => x.clientId === clientId).length;
  const logins = users.filter((u) => u.clientId === clientId).length;

  if (!client) {
    return (
      <Surface>
        <EmptyState
          title="We could not find that client"
          detail="They may have been removed."
          action={
            <Button asChild>
              <Link to="/clients">Back to clients</Link>
            </Button>
          }
        />
      </Surface>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/clients"
        className="type-small -mb-2 inline-flex min-h-11 w-fit items-center gap-1 text-muted-foreground hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All clients
      </Link>
      <PageHeader
        title={client.name}
        description={[client.city, client.contactName].filter(Boolean).join(" · ")}
        action={
          <>
            <StatusBadge status={client.status} />
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              Invite someone
            </Button>
          </>
        }
      />

      <nav
        aria-label="Client sections"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.id}
            to="/clients/$clientId"
            params={{ clientId }}
            search={{ tab: t.id }}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "type-body -mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 font-medium transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <OverviewTab
          client={client}
          siteCount={siteCount}
          logins={logins}
          onRemove={() => setRemoveOpen(true)}
        />
      ) : null}
      {tab === "modules" ? <ModulesTab client={client} /> : null}
      {tab === "logins" ? <TeamManager clientId={clientId} /> : null}
      {tab === "sites" ? <SitesTab clientId={clientId} /> : null}
      {tab === "billing" ? <BillingTab clientId={clientId} /> : null}

      <InviteDialog
        target={inviteOpen ? { id: client.id, name: client.name } : null}
        onOpenChange={(v) => {
          if (!v) setInviteOpen(false);
        }}
        onInvite={async (name, email) => {
          const ok = await saveAction(`Invite sent to ${email}`, () =>
            inviteUser({ email, name, role: "client", tenantId: client.id }),
          );
          if (ok) setInviteOpen(false);
        }}
      />
      <ConfirmDangerDialog
        open={removeOpen}
        title={`Remove ${client.name}?`}
        description={`This takes down their public sites (${siteCount}), website content, and logins (${logins}). They will not be able to sign in. This cannot be undone.`}
        confirmLabel="Remove client"
        onOpenChange={setRemoveOpen}
        onConfirm={async () => {
          const ok = await saveAction(`${client.name} removed`, () => removeClient(client.id));
          if (ok) {
            setRemoveOpen(false);
            void navigate({ to: "/clients" });
          }
        }}
      />
    </div>
  );
}

function OverviewTab({
  client,
  siteCount,
  logins,
  onRemove,
}: {
  client: Client;
  siteCount: number;
  logins: number;
  onRemove: () => void;
}) {
  const requests = useAscStore((s) => s.requests);
  const log = useAscStore((s) => s.log);
  const openRequests = requests.filter(
    (r) => r.clientId === client.id && r.status === "open",
  ).length;
  const lastChange = log
    .filter((l) => l.clientId === client.id)
    .map((l) => l.at)
    .sort()
    .at(-1);
  const rows: [string, string][] = [
    ["Contact", client.contactName || "Not set"],
    ["Email", client.email || "Not set"],
    ["Phone", client.phone || "Not set"],
    ["Address", client.address || "Not set"],
    ["Opening hours", client.hours || "Not set"],
    ["Sites", String(siteCount)],
    ["Logins", String(logins)],
    ["Open requests", String(openRequests)],
    ["Last activity", lastChange ? formatRelative(lastChange) : "None yet"],
  ];
  return (
    <>
      <Surface>
        <SectionHeader
          inset
          title="Details"
          detail="What the client has told us. They edit it on their Business page."
        />
        <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="type-label">{k}</dt>
              <dd className="type-body mt-1">{v}</dd>
            </div>
          ))}
        </dl>
      </Surface>
      <Surface>
        <SectionHeader
          inset
          title="Remove this client"
          detail="Takes down their sites, content and logins for good."
        />
        <div className="p-5">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            Remove client
          </Button>
        </div>
      </Surface>
    </>
  );
}

function ModulesTab({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-6">
      <ModuleGroup
        client={client}
        title="Desk modules"
        detail="Store, calendar, bookings and site pictures."
        items={DESK_MODULE_TOGGLES}
      />
      <ModuleGroup
        client={client}
        title="Website extras"
        detail="Turn on only what their public site actually has."
        items={WEBSITE_MODULE_TOGGLES}
      />
    </div>
  );
}

function ModuleGroup({
  client,
  title,
  detail,
  items,
}: {
  client: Client;
  title: string;
  detail: string;
  items: ReadonlyArray<{ key: ModuleKey; label: string; title?: string }>;
}) {
  const updateClient = useAscStore((s) => s.updateClient);
  return (
    <Surface>
      <SectionHeader inset title={title} detail={detail} />
      <ul className="divide-y divide-border">
        {items.map((m) => (
          <li key={m.key} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="type-body font-medium">{m.label}</p>
              {m.title ? <p className="type-small text-muted-foreground">{m.title}</p> : null}
            </div>
            <Switch
              checked={client.modules[m.key]}
              aria-label={`${m.label} for ${client.name}`}
              onCheckedChange={(on) => {
                void saveAction(on ? `${m.label} turned on` : `${m.label} turned off`, () =>
                  updateClient(client.id, { modules: { ...client.modules, [m.key]: on } }),
                );
              }}
            />
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function SitesTab({ clientId }: { clientId: string }) {
  const allSites = useAscStore((s) => s.sites);
  const sites = allSites.filter((x) => x.clientId === clientId);
  return (
    <Surface>
      <SectionHeader
        inset
        title="Sites"
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/sites">Manage sites</Link>
          </Button>
        }
      />
      {sites.length === 0 ? (
        <EmptyState
          title="No sites yet"
          detail="Add a public site so this client can edit their website."
          action={
            <Button asChild>
              <Link to="/sites">Add a site</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {sites.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="type-body font-medium">{s.name}</p>
                <p className="type-small text-muted-foreground">{s.url}</p>
              </div>
              <span className="type-small capitalize text-muted-foreground">{s.kind}</span>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

function BillingTab({ clientId }: { clientId: string }) {
  const allInvoices = useAscStore((s) => s.invoices);
  const allRenewals = useAscStore((s) => s.renewals);
  const invoices = allInvoices.filter((i) => i.clientId === clientId);
  const renewals = allRenewals
    .filter((r) => r.clientId === clientId)
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  return (
    <div className="flex flex-col gap-4">
      <StaffPlanCard clientId={clientId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface>
          <SectionHeader inset title="Invoices" />
          {invoices.length === 0 ? (
            <EmptyState title="No invoices yet" />
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="type-body font-medium">{i.item}</p>
                    <p className="type-small text-muted-foreground">
                      {i.ref} · due {formatDay(i.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="type-body">{formatZar(i.amountZar)}</span>
                    <StatusBadge status={i.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>
        <Surface>
          <SectionHeader inset title="Renewals" />
          {renewals.length === 0 ? (
            <EmptyState title="No renewals yet" />
          ) : (
            <ul className="divide-y divide-border">
              {renewals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="type-body font-medium">{r.item}</p>
                    <p className="type-small capitalize text-muted-foreground">
                      {r.type === "ssl" ? "certificate" : r.type}
                    </p>
                  </div>
                  <span className="type-body">{formatDay(r.expiresAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </div>
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
              They get an email, set a password, and only see this client.
            </DialogDescription>
          </DialogHeader>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
