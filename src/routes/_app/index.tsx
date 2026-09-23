import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { EmptyDesk } from "@/components/desk-ui";
import { Kpi, NativeSelect, PageHeader, Surface } from "@/components/page-header";
import { StatusDot } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay, formatRelative } from "@/lib/format";
import {
  WEBSITE_MODULE_TOGGLES,
  type WebsiteModuleKey,
} from "@/lib/modules";
import {
  useActiveSite,
  useAscStore,
  useCurrentUser,
  useOwnClient,
  useOwnSites,
  visibleClientIds,
} from "@/lib/store";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

function HomePage() {
  const user = useCurrentUser();
  if (user?.role === "client") return <ClientOverview />;
  return <StaffDashboard />;
}

function StaffDashboard() {
  const clients = useAscStore((s) => s.clients);
  const sites = useAscStore((s) => s.sites);
  const monitors = useAscStore((s) => s.monitors);
  const incidents = useAscStore((s) => s.incidents);
  const requests = useAscStore((s) => s.requests);
  const openIncidents = incidents.filter((i) => i.status === "open").length;
  const openRequests = requests.filter((r) => r.status === "open").length;
  const offline = monitors.filter((m) => m.status === "down").length;
  const publicSites = sites.filter((s) => s.kind === "public");
  const missingSite = clients.filter(
    (c) => !publicSites.some((s) => s.clientId === c.id),
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Dashboard"
        description="Clients, the public sites on each login, and the modules we switched on. A client with two or more sites switches among them in their account menu."
      />

      <section className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Clients"
          value={String(clients.length)}
          hint={`${publicSites.length} public sites · ${sites.length} total`}
          accent
        />
        <Kpi
          label="Monitors"
          value={String(monitors.length)}
          hint="checked on their own schedules"
        />
        <Kpi
          label="Offline now"
          value={String(offline)}
          hint={offline === 0 ? "All responding" : "Needs a look"}
          valueClass={offline === 0 ? "text-emerald" : "text-destructive"}
        />
        <Kpi
          label="Open work"
          value={String(openIncidents + openRequests)}
          hint={`${openIncidents} incidents, ${openRequests} requests`}
        />
      </section>

      {missingSite.length > 0 ? (
        <Surface>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              No public site yet
            </p>
            <Button asChild size="sm" className="rounded-full">
              <Link to="/sites">Add a site</Link>
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {missingSite.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-champagne">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Their login cannot edit a website until you attach one.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/sites">Sites</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      <SystemsTable />

      <div className="grid gap-4 lg:grid-cols-2">
        <RenewalsPanel />
        <ChangesPanel />
      </div>
    </div>
  );
}

const EXTRA_CARDS: Record<WebsiteModuleKey, { title: string; detail: string }> = {
  seo: { title: "Search listing", detail: "Title, description, and social image for this site." },
  faq: { title: "Questions", detail: "Answers visitors see on this site." },
  testimonials: { title: "Quotes", detail: "What customers said, on this site only." },
  gallery: { title: "Photos", detail: "Pictures on this site." },
  services: { title: "Services", detail: "Names, prices, and descriptions on this site." },
  staff: { title: "Team", detail: "People listed on this site." },
};

function DeskCard({
  to,
  hash,
  kicker,
  title,
  detail,
}: {
  to: string;
  hash?: string;
  kicker: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      className="border border-border bg-card px-5 py-4 hover:border-emerald/40"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald">{kicker}</p>
      <p className="mt-2 font-display text-xl text-champagne">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </Link>
  );
}

function ClientOverview() {
  const own = useOwnClient();
  const sites = useOwnSites();
  const activeSite = useActiveSite();
  const setActiveSite = useAscStore((s) => s.setActiveSite);
  const allMonitors = useAscStore((s) => s.monitors);
  const visitors = useAscStore((s) => s.visitors);
  const allEnquiries = useAscStore((s) => s.enquiries);
  const invoices = useAscStore((s) => s.invoices);
  const siteId = activeSite?.id;
  const monitors = allMonitors.filter((m) => (siteId ? m.siteId === siteId : false));
  const problems = monitors.filter((m) => m.status === "down").length;
  const views = visitors
    .filter((v) => (siteId ? v.siteId === siteId : false))
    .reduce((a, v) => a + v.views, 0);
  const fresh = allEnquiries.filter((e) => e.clientId === own?.id && e.status === "new");
  const dueInvoices = invoices.filter((i) => i.clientId === own?.id && i.status === "due");
  const extras = WEBSITE_MODULE_TOGGLES.filter((mod) => own?.modules[mod.key]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Today"
        description={
          sites.length > 1
            ? `You are on ${activeSite?.name ?? "a site"}. Switch below or in the account menu — each site has its own pages.`
            : activeSite
              ? `What needs you on ${activeSite.name}.`
              : "ASC still needs to attach a public site to this account."
        }
        action={
          sites.length > 1 ? (
            <label className="block min-w-[12rem]">
              <span className="sr-only">Switch site</span>
              <NativeSelect
                value={activeSite?.id ?? ""}
                onChange={(e) => setActiveSite(e.target.value)}
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
          ) : undefined
        }
      />

      {sites.length === 0 ? (
        <EmptyDesk
          title="No website attached yet"
          detail="When ASC adds a public site, you will edit that site from here. Store, calendar, and bookings still work for the whole account."
        />
      ) : null}

      <section className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="New enquiries"
          value={String(fresh.length)}
          hint="From the form on your sites"
          accent
        />
        <Kpi
          label="Problems now"
          value={siteId ? String(problems) : "—"}
          hint={
            !siteId
              ? "No public site yet"
              : problems === 0
                ? `All clear on ${activeSite?.name}`
                : `On ${activeSite?.name}`
          }
          valueClass={!siteId || problems === 0 ? "text-emerald" : "text-destructive"}
        />
        <Kpi
          label="Visitors, 14 days"
          value={siteId ? String(views) : "—"}
          hint={siteId ? `On ${activeSite?.name}, bots excluded` : "No public site yet"}
        />
        <Kpi
          label="Invoices due"
          value={String(dueInvoices.length)}
          hint={dueInvoices[0] ? dueInvoices[0].item : "Nothing outstanding"}
        />
      </section>

      <NeedsYou />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DeskCard
          to="/content"
          kicker="Website"
          title={activeSite ? `Edit ${activeSite.name}` : "Change a page"}
          detail={
            sites.length > 1
              ? "Welcome, hours, and extras for the site you are on."
              : "Welcome, hours, and the rest of the homepage."
          }
        />
        {extras.map((mod) => (
          <DeskCard
            key={mod.key}
            to="/content"
            hash={mod.key}
            kicker={mod.label}
            title={EXTRA_CARDS[mod.key].title}
            detail={EXTRA_CARDS[mod.key].detail}
          />
        ))}
        {own?.modules.store ? (
          <DeskCard
            to="/store"
            kicker="Store"
            title="Products"
            detail={
              activeSite
                ? `Products on ${activeSite.name}. Other sites keep their own shop.`
                : "Add items, set a price, mark them Active."
            }
          />
        ) : null}
        {own?.modules.calendar ? (
          <DeskCard
            to="/calendar"
            kicker="Calendar"
            title="Dates and times"
            detail={
              activeSite
                ? `Dates on ${activeSite.name}. Other sites keep their own diary.`
                : "Services, camps, closed days."
            }
          />
        ) : null}
        {own?.modules.bookings ? (
          <DeskCard
            to="/bookings"
            kicker="Bookings"
            title="Reservations"
            detail={
              activeSite
                ? `Reservations on ${activeSite.name}. Other sites keep their own bookings.`
                : "Rooms, tables, slots."
            }
          />
        ) : null}
        <DeskCard
          to="/business"
          kicker="Business"
          title="Hours and phone"
          detail="Company details. Shared on every site for this account."
        />
      </div>

      <SystemsTable clientOnly />

      <div className="grid gap-4 lg:grid-cols-2">
        <RenewalsPanel />
        <ChangesPanel />
      </div>
    </div>
  );
}

function NeedsYou() {
  const own = useOwnClient();
  const activeSite = useActiveSite();
  const enquiries = useAscStore((s) => s.enquiries);
  const invoices = useAscStore((s) => s.invoices);
  const sections = useAscStore((s) => s.sections);
  const adverts = useAscStore((s) => s.adverts);
  const products = useAscStore((s) => s.products);
  const today = new Date().toISOString().slice(0, 10);
  const siteId = activeSite?.id;
  const fresh = enquiries.filter((e) => e.clientId === own?.id && e.status === "new");
  const dueInvoices = invoices.filter((i) => i.clientId === own?.id && i.status === "due");
  const siteSections = sections.filter((s) => s.siteId === siteId);
  const welcomeLine = String(
    siteSections.find((s) => s.key === "welcome")?.payload.line ?? "",
  ).trim();
  const seoTitle = String(
    siteSections.find((s) => s.key === "seo")?.payload.title ?? "",
  ).trim();
  const ownAdverts = adverts.filter((a) => a.siteId === siteId);
  const live = ownAdverts.find(
    (a) => a.status === "live" && a.startsOn <= today && a.endsOn >= today,
  );
  const expired =
    ownAdverts.some((a) => a.status === "live" && a.endsOn < today) ||
    (!live && ownAdverts.some((a) => a.status === "expired"));
  const out = products.filter(
    (p) => p.siteId === siteId && p.live && p.stock === 0,
  );
  const items: {
    to: "/enquiries" | "/content" | "/store" | "/billing";
    hash?: string;
    title: string;
    detail: string;
  }[] = [];
  for (const e of fresh) {
    items.push({ to: "/enquiries", title: `${e.name} wrote in`, detail: e.message });
  }
  if (siteId && own?.modules.advert && (!live || expired)) {
    items.push({
      to: "/content",
      title: expired ? `A picture on ${activeSite?.name} has run out` : `No pictures on ${activeSite?.name}`,
      detail: "Add a picture on Website and mark it Live. Other sites are unchanged.",
    });
  }
  for (const p of out) {
    items.push({ to: "/store", title: `${p.name} is live with 0 left`, detail: "Hide it or restock." });
  }
  if (siteId && !welcomeLine) {
    items.push({
      to: "/content",
      title: `No welcome line on ${activeSite?.name}`,
      detail: "The hero on this homepage is empty.",
    });
  }
  if (siteId && own?.modules.seo && !seoTitle) {
    items.push({
      to: "/content",
      hash: "seo",
      title: `No search title on ${activeSite?.name}`,
      detail: "Add the page title Google and social apps should show.",
    });
  }
  for (const inv of dueInvoices) {
    items.push({ to: "/billing", title: `${inv.item} is due`, detail: inv.ref });
  }

  return (
    <Surface>
      <div className="border-b border-border px-5 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Needs you
        </p>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          Quiet. When something needs you, it shows here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, i) => (
            <li key={`${item.to}-${item.hash ?? ""}-${i}`}>
              <Link
                to={item.to}
                hash={item.hash}
                className="flex min-h-11 items-center justify-between gap-3 px-5 py-4 hover:bg-accent/40"
              >
                <div>
                  <p className="text-champagne">{item.title}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <span className="text-sm text-emerald">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

function SystemsTable({ clientOnly = false }: { clientOnly?: boolean }) {
  const user = useCurrentUser();
  const clients = useAscStore((s) => s.clients);
  const allSites = useAscStore((s) => s.sites);
  const allMonitors = useAscStore((s) => s.monitors);
  const runChecks = useAscStore((s) => s.runChecks);
  const ids = visibleClientIds({ clients }, user);
  const sites = allSites.filter((s) => ids.includes(s.clientId));

  const rows = sites.map((site) => {
    const client = clients.find((c) => c.id === site.clientId);
    const monitors = allMonitors.filter((m) => m.siteId === site.id);
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
          {clientOnly ? "Your sites" : "All sites"}
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
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-5 py-10 text-sm text-muted-foreground"
                  colSpan={clientOnly ? 6 : 7}
                >
                  {clientOnly
                    ? "No public site on this account yet. ASC adds them from Sites."
                    : "No sites yet. Add a public site to a client so they can edit it."}
                </td>
              </tr>
            ) : null}
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
                      <Link
                        to="/content"
                        onClick={() => useAscStore.getState().setActiveSite(site.id)}
                      >
                        Edit content
                      </Link>
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
  const clients = useAscStore((s) => s.clients);
  const renewals = useAscStore((s) => s.renewals);
  const ids = visibleClientIds({ clients }, user);
  const rows = useMemo(() => {
    return renewals
      .filter((r) => ids.includes(r.clientId))
      .slice()
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  }, [renewals, ids]);

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
            const client = clients.find((c) => c.id === r.clientId);
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
  const clients = useAscStore((s) => s.clients);
  const log = useAscStore((s) => s.log);
  const ids = visibleClientIds({ clients }, user);
  const rows = log.filter((l) => ids.includes(l.clientId)).slice(0, 8);

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
