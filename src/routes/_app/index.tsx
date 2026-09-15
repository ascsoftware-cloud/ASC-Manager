import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Kpi, PageHeader, Surface } from "@/components/page-header";
import { StatusDot } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay, formatRelative } from "@/lib/format";
import { useAscStore, useCurrentUser, useOwnClient, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

function HomePage() {
  const user = useCurrentUser();
  if (user?.role === "client") return <ClientOverview />;
  return <StaffDashboard />;
}

function StaffDashboard() {
  const store = useAscStore();
  const openIncidents = store.incidents.filter((i) => i.status === "open").length;
  const openRequests = store.requests.filter((r) => r.status === "open").length;
  const offline = store.monitors.filter((m) => m.status === "down").length;
  const degraded = store.monitors.filter((m) => m.status === "down").length;
  const liveSites = store.sites.length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Dashboard"
        description="Every client system ASC monitors."
      />

      <section className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Clients"
          value={String(store.clients.length)}
          hint={`${liveSites} active sites`}
          accent
        />
        <Kpi
          label="Monitors"
          value={String(store.monitors.length)}
          hint="checked on their own schedules"
        />
        <Kpi
          label="Offline now"
          value={String(offline)}
          hint={`${degraded} degraded`}
          valueClass={offline === 0 ? "text-emerald" : "text-destructive"}
        />
        <Kpi
          label="Open work"
          value={String(openIncidents + openRequests)}
          hint={`${openIncidents} incidents, ${openRequests} requests`}
        />
      </section>

      <SystemsTable />

      <div className="grid gap-4 lg:grid-cols-2">
        <RenewalsPanel />
        <ChangesPanel />
      </div>
    </div>
  );
}

function ClientOverview() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const store = useAscStore();
  const ids = visibleClientIds(store, user);
  const sites = store.sites.filter((s) => ids.includes(s.clientId));
  const siteIds = sites.map((s) => s.id);
  const monitors = store.monitors.filter((m) => siteIds.includes(m.siteId));
  const problems = monitors.filter((m) => m.status === "down").length;
  const views = store.visitors
    .filter((v) => siteIds.includes(v.siteId))
    .reduce((a, v) => a + v.views, 0);
  const enquiries = store.enquiries.filter((e) => ids.includes(e.clientId));
  const fresh = enquiries.filter((e) => e.status === "new");
  const dueInvoices = store.invoices.filter(
    (i) => ids.includes(i.clientId) && i.status === "due",
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Today"
        description="What needs you on your site."
      />

      <section className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="New enquiries"
          value={String(fresh.length)}
          hint="From the form on your site"
          accent
        />
        <Kpi
          label="Problems now"
          value={String(problems)}
          hint={problems === 0 ? "Everything is responding" : "Needs a look"}
          valueClass={problems === 0 ? "text-emerald" : "text-destructive"}
        />
        <Kpi
          label="Visitors, 14 days"
          value={String(views)}
          hint="page views, bots excluded"
        />
        <Kpi
          label="Invoices due"
          value={String(dueInvoices.length)}
          hint={dueInvoices[0] ? dueInvoices[0].item : "Nothing outstanding"}
        />
      </section>

      <Surface>
        <div className="border-b border-border px-5 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Needs you
          </p>
        </div>
        {fresh.length === 0 && dueInvoices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            Quiet. When someone writes from the site, it will show here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {fresh.map((e) => (
              <li key={e.id}>
                <Link
                  to="/enquiries"
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-accent/40"
                >
                  <div>
                    <p className="text-champagne">{e.name} wrote in</p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{e.message}</p>
                  </div>
                  <span className="text-sm text-emerald">Open</span>
                </Link>
              </li>
            ))}
            {dueInvoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  to="/billing"
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-accent/40"
                >
                  <div>
                    <p className="text-champagne">{inv.item} is due</p>
                    <p className="text-sm text-muted-foreground">{inv.ref}</p>
                  </div>
                  <span className="text-sm text-emerald">Billing</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/content"
          className="border border-border bg-card px-5 py-4 hover:border-emerald/40"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">Website</p>
          <p className="mt-2 font-display text-xl text-champagne">Change a page</p>
          <p className="mt-1 text-sm text-muted-foreground">Specials, captions, links.</p>
        </Link>
        {own?.modules.store ? (
          <Link
            to="/store"
            className="border border-border bg-card px-5 py-4 hover:border-emerald/40"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">Store</p>
            <p className="mt-2 font-display text-xl text-champagne">Shop items</p>
            <p className="mt-1 text-sm text-muted-foreground">Price, stock, live or hidden.</p>
          </Link>
        ) : null}
        {own?.modules.calendar ? (
          <Link
            to="/calendar"
            className="border border-border bg-card px-5 py-4 hover:border-emerald/40"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">Calendar</p>
            <p className="mt-2 font-display text-xl text-champagne">Dates and times</p>
            <p className="mt-1 text-sm text-muted-foreground">Services, camps, closed days.</p>
          </Link>
        ) : null}
        {own?.modules.bookings ? (
          <Link
            to="/bookings"
            className="border border-border bg-card px-5 py-4 hover:border-emerald/40"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">Bookings</p>
            <p className="mt-2 font-display text-xl text-champagne">Reservations</p>
            <p className="mt-1 text-sm text-muted-foreground">Rooms, tables, slots.</p>
          </Link>
        ) : null}
        <Link
          to="/business"
          className="border border-border bg-card px-5 py-4 hover:border-emerald/40"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">Business</p>
          <p className="mt-2 font-display text-xl text-champagne">Hours and phone</p>
          <p className="mt-1 text-sm text-muted-foreground">Footer details on the live site.</p>
        </Link>
        <Link
          to="/media"
          className="border border-border bg-card px-5 py-4 hover:border-emerald/40"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">Photos</p>
          <p className="mt-2 font-display text-xl text-champagne">Add a picture</p>
          <p className="mt-1 text-sm text-muted-foreground">Rooms, food, the shop floor.</p>
        </Link>
      </div>

      <SystemsTable clientOnly />

      <div className="grid gap-4 lg:grid-cols-2">
        <RenewalsPanel />
        <ChangesPanel />
      </div>
    </div>
  );
}

function SystemsTable({ clientOnly = false }: { clientOnly?: boolean }) {
  const user = useCurrentUser();
  const store = useAscStore();
  const runChecks = useAscStore((s) => s.runChecks);
  const ids = visibleClientIds(store, user);
  const sites = store.sites.filter((s) => ids.includes(s.clientId));

  const rows = sites.map((site) => {
    const client = store.clients.find((c) => c.id === site.clientId);
    const monitors = store.monitors.filter((m) => m.siteId === site.id);
    const down = monitors.some((m) => m.status === "down");
    const up = monitors.every((m) => m.status === "up");
    const last = monitors
      .map((m) => m.lastCheckedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    const uptime = monitors.find((m) => m.uptime30 != null)?.uptime30;
    return { site, client, down, up, last, uptime };
  });

  return (
    <Surface>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {clientOnly ? "Your systems" : "All systems"}
        </p>
        {!clientOnly ? (
          <Button asChild size="sm" className="rounded-full">
            <Link to="/sites">Manage sites</Link>
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3 font-medium">Status</th>
              {!clientOnly ? <th className="px-5 py-3 font-medium">Client</th> : null}
              <th className="px-5 py-3 font-medium">System</th>
              <th className="px-5 py-3 font-medium">Recent checks</th>
              <th className="px-5 py-3 font-medium">Uptime, 30 days</th>
              <th className="px-5 py-3 font-medium">Last checked</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ site, client, down, up, last, uptime }) => (
              <tr key={site.id} className="border-b border-border last:border-0">
                <td className="px-5 py-4">
                  <StatusDot status={down ? "down" : up ? "up" : "unchecked"} />
                </td>
                {!clientOnly ? (
                  <td className="px-5 py-4 text-champagne">{client?.name}</td>
                ) : null}
                <td className="px-5 py-4">
                  <p className="font-medium text-champagne">{site.name}</p>
                  <p className="text-xs text-muted-foreground">{site.url}</p>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {last ? "Checked" : "No checks yet"}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {uptime == null ? "no data" : `${uptime}%`}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {last ? formatRelative(last) : "never"}
                </td>
                <td className="px-5 py-4 text-right">
                  {clientOnly ? (
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link to="/content">Edit content</Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        void runChecks(site.id);
                      }}
                    >
                      Checks
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

function RenewalsPanel() {
  const user = useCurrentUser();
  const store = useAscStore();
  const ids = visibleClientIds(store, user);
  const rows = useMemo(() => {
    return store.renewals
      .filter((r) => ids.includes(r.clientId))
      .slice()
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  }, [store.renewals, ids]);

  return (
    <Surface>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Renewals due
        </p>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to={user?.role === "operator" ? "/renewals" : "/billing"}>
            {user?.role === "operator" ? "All renewals" : "Billing"}
          </Link>
        </Button>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {user?.role === "operator" ? (
              <th className="px-5 py-3 font-medium">Client</th>
            ) : null}
            <th className="px-5 py-3 font-medium">Item</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 font-medium">Expires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const client = store.clients.find((c) => c.id === r.clientId);
            const days = differenceInCalendarDays(parseISO(r.expiresAt), new Date());
            return (
              <tr key={r.id} className="border-b border-border last:border-0">
                {user?.role === "operator" ? (
                  <td className="px-5 py-3 text-champagne">{client?.name}</td>
                ) : null}
                <td className="px-5 py-3 text-champagne">{r.item}</td>
                <td className="px-5 py-3 capitalize text-muted-foreground">{r.type}</td>
                <td className="px-5 py-3">
                  <p className="text-gold">{formatDay(r.expiresAt)}</p>
                  <p className="text-xs text-muted-foreground">in {days} days</p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Surface>
  );
}

function ChangesPanel() {
  const user = useCurrentUser();
  const store = useAscStore();
  const ids = visibleClientIds(store, user);
  const rows = store.log.filter((l) => ids.includes(l.clientId)).slice(0, 8);

  return (
    <Surface>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Recent changes
        </p>
        <Button size="sm" variant="outline" className="rounded-full" disabled>
          Full log
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-sm text-muted-foreground">
          Nothing has been changed yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((l) => (
            <li key={l.id} className="px-5 py-3 text-sm">
              <p className="text-champagne">{l.summary}</p>
              <p className="text-xs text-muted-foreground">
                {l.actor} · {formatRelative(l.at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
