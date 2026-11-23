import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { CircleCheck } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { Surface } from "@/components/ui/surface";
import { formatDay, formatRelative } from "@/lib/format";
import { useAscStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type StaffLink = "/incidents" | "/renewals" | "/requests" | "/monitors" | "/sites" | "/clients";

/** The staff operations overview. Most urgent first. */
export function StaffDashboard() {
  const clients = useAscStore((s) => s.clients);
  const sites = useAscStore((s) => s.sites);
  const monitors = useAscStore((s) => s.monitors);
  const incidents = useAscStore((s) => s.incidents);
  const requests = useAscStore((s) => s.requests);
  const renewals = useAscStore((s) => s.renewals);
  const log = useAscStore((s) => s.log);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "Unknown client";
  const siteOf = (id: string) => sites.find((s) => s.id === id);
  /** "Client · Site", without repeating the name when they are the same. */
  const where = (siteId: string) => {
    const site = siteOf(siteId);
    if (!site) return "Unknown client";
    const client = clientName(site.clientId);
    return site.name === client ? client : `${client} · ${site.name}`;
  };

  const publicSites = sites.filter((s) => s.kind === "public");
  const downSiteIds = new Set(monitors.filter((m) => m.status === "down").map((m) => m.siteId));
  const respondingSites = publicSites.filter((s) => !downSiteIds.has(s.id)).length;
  const openIncidents = incidents.filter((i) => i.status === "open");
  const openRequests = requests.filter((r) => r.status === "open");
  const dueSoon = renewals
    .map((r) => ({ ...r, days: differenceInCalendarDays(parseISO(r.expiresAt), new Date()) }))
    .filter((r) => r.days <= 30)
    .sort((a, b) => a.days - b.days);
  const missingSite = clients.filter((c) => !publicSites.some((s) => s.clientId === c.id));
  const activeClients = clients.filter((c) => c.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="type-title">Dashboard</h1>
        <p className="type-body text-muted-foreground">
          Everything across your clients, with the most urgent first.
        </p>
      </header>

      <section aria-label="Totals" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <TileLink to="/clients">
          <StatTile label="Clients" value={clients.length} hint={`${activeClients} active`} />
        </TileLink>
        <TileLink to="/sites">
          <StatTile
            label="Live sites"
            value={publicSites.length}
            hint={
              publicSites.length === 0
                ? "None yet"
                : `${respondingSites} of ${publicSites.length} responding`
            }
            tone={publicSites.length > 0 && respondingSites < publicSites.length ? "bad" : "default"}
          />
        </TileLink>
        <TileLink to="/incidents">
          <StatTile
            label="Open incidents"
            value={openIncidents.length}
            hint={openIncidents.length === 0 ? "All quiet" : "Not resolved yet"}
            tone={openIncidents.length > 0 ? "bad" : "good"}
          />
        </TileLink>
        <TileLink to="/renewals">
          <StatTile
            label="Renewals, 30 days"
            value={dueSoon.length}
            hint={dueSoon.length === 0 ? "Nothing due" : "Domains, hosting, certificates"}
            tone={dueSoon.length > 0 ? "warn" : "default"}
          />
        </TileLink>
        <TileLink to="/requests">
          <StatTile
            label="Open requests"
            value={openRequests.length}
            hint={openRequests.length === 0 ? "Nothing waiting" : "Clients are waiting"}
            tone={openRequests.length > 0 ? "warn" : "default"}
          />
        </TileLink>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Open incidents"
          to="/incidents"
          empty="No open incidents."
          rows={openIncidents.slice(0, 5).map((i) => (
            <Row
              key={i.id}
              to="/incidents"
              title={i.title}
              sub={where(i.siteId)}
              end={<StatusBadge status="down" label={formatRelative(i.openedAt)} />}
            />
          ))}
        />
        <Panel
          title="Renewals due in 30 days"
          to="/renewals"
          empty="No renewals due in the next 30 days."
          rows={dueSoon.slice(0, 5).map((r) => (
            <Row
              key={r.id}
              to="/renewals"
              title={r.item}
              sub={`${clientName(r.clientId)} · ${formatDay(r.expiresAt)}`}
              end={
                <StatusBadge
                  tone={r.days < 0 ? "bad" : r.days <= 7 ? "warn" : "neutral"}
                  label={r.days < 0 ? "Overdue" : r.days === 0 ? "Today" : `${r.days} days`}
                />
              }
            />
          ))}
        />
        <Panel
          title="Open requests"
          to="/requests"
          empty="No client requests waiting."
          rows={openRequests.slice(0, 5).map((r) => (
            <Row
              key={r.id}
              to="/requests"
              title={r.title}
              sub={`${clientName(r.clientId)} · ${r.authorName}`}
              end={<span className="type-small text-muted-foreground">{formatRelative(r.createdAt)}</span>}
            />
          ))}
        />
        <Panel
          title="Sites that are down"
          to="/monitors"
          empty="Every monitored site is responding."
          rows={monitors
            .filter((m) => m.status === "down")
            .slice(0, 5)
            .map((m) => {
              const site = siteOf(m.siteId);
              return (
                <Row
                  key={m.id}
                  to="/monitors"
                  title={site?.name ?? m.label}
                  sub={`${where(m.siteId)} · ${m.label}`}
                  end={
                    <span className="type-small text-muted-foreground">
                      {m.lastCheckedAt ? formatRelative(m.lastCheckedAt) : "never checked"}
                    </span>
                  }
                />
              );
            })}
        />
      </div>

      {missingSite.length > 0 ? (
        <Surface>
          <SectionHeader
            inset
            title="Clients without a public site"
            detail="They cannot edit a website until you attach one."
            action={
              <Button asChild size="sm">
                <Link to="/sites">Add a site</Link>
              </Button>
            }
          />
          <ul className="divide-y divide-border">
            {missingSite.map((c) => (
              <li key={c.id} className="type-body flex items-center justify-between gap-3 px-5 py-3">
                <span className="font-medium">{c.name}</span>
                <span className="type-small text-muted-foreground">{c.city}</span>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {log.length > 0 ? (
        <Surface>
          <SectionHeader inset title="Recent changes" />
          <ul className="divide-y divide-border">
            {log.slice(0, 6).map((l) => (
              <li key={l.id} className="px-5 py-3">
                <p className="type-body">{l.summary}</p>
                <p className="type-small text-muted-foreground">
                  {clientName(l.clientId)} · {l.actor} · {formatRelative(l.at)}
                </p>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </div>
  );
}

function TileLink({ to, children }: { to: StaffLink; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="block rounded-xl transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:outline-offset-2"
    >
      {children}
    </Link>
  );
}

function Panel({
  title,
  to,
  rows,
  empty,
}: {
  title: string;
  to: StaffLink;
  rows: ReactNode[];
  empty: string;
}) {
  return (
    <Surface className="flex flex-col">
      <SectionHeader
        inset
        title={title}
        action={
          <Button asChild size="sm" variant="ghost">
            <Link to={to}>View all</Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <p className="type-body flex items-center gap-2 px-5 py-6 text-muted-foreground">
          <CircleCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border">{rows}</ul>
      )}
    </Surface>
  );
}

function Row({
  to,
  title,
  sub,
  end,
}: {
  to: StaffLink;
  title: string;
  sub: string;
  end: ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className={cn("flex min-h-14 items-center justify-between gap-4 px-5 py-3 hover:bg-accent/50")}
      >
        <span className="min-w-0">
          <span className="type-body block truncate font-medium">{title}</span>
          <span className="type-small block truncate text-muted-foreground">{sub}</span>
        </span>
        <span className="shrink-0">{end}</span>
      </Link>
    </li>
  );
}
