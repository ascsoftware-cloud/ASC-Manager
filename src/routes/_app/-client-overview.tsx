import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  CircleCheck,
  Globe,
  Hammer,
  Images,
  ShoppingBag,
  Users,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { Surface } from "@/components/ui/surface";
import { formatDay, formatRelative } from "@/lib/format";
import { canManageTeam, canUse, type PermissionKey } from "@/lib/permissions";
import {
  useActiveSite,
  useAscStore,
  useCurrentUser,
  useOwnClient,
  useOwnSites,
} from "@/lib/store";
import { cn } from "@/lib/utils";

type ClientLink = "/enquiries" | "/content" | "/store" | "/billing" | "/business" | "/media" | "/team" | "/calendar" | "/bookings";

/** The client's own overview. Calm when quiet, specific when something needs them. */
export function ClientOverview() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const sites = useOwnSites();
  const activeSite = useActiveSite();
  const can = (key: PermissionKey) => canUse(user, key);
  const firstName = (user?.name ?? "").split(" ")[0];

  const enquiries = useAscStore((s) => s.enquiries);
  const invoices = useAscStore((s) => s.invoices);
  const monitors = useAscStore((s) => s.monitors);
  const visitors = useAscStore((s) => s.visitors);
  const products = useAscStore((s) => s.products);

  const siteId = activeSite?.id;
  const mine = (clientId: string) => clientId === own?.id;
  const allEnquiries = enquiries.filter((e) => mine(e.clientId));
  const fresh = allEnquiries.filter((e) => e.status === "new");
  const dueInvoices = invoices.filter((i) => mine(i.clientId) && i.status === "due");
  const siteMonitors = monitors.filter((m) => m.siteId === siteId && m.status !== "unchecked");
  const down = siteMonitors.filter((m) => m.status === "down").length;
  const views = visitors.filter((v) => v.siteId === siteId).reduce((a, v) => a + v.views, 0);
  const liveProducts = products.filter((p) => p.siteId === siteId && p.live).length;

  type Tile = { key: string; node: ReactNode };
  const tiles: Tile[] = [];
  if (can("enquiries") && allEnquiries.length > 0) {
    tiles.push({
      key: "enquiries",
      node: (
        <StatTile
          label="New enquiries"
          value={fresh.length}
          hint={fresh.length === 0 ? "You are up to date" : "Waiting for a reply"}
          tone={fresh.length > 0 ? "warn" : "default"}
        />
      ),
    });
  }
  if (siteMonitors.length > 0) {
    tiles.push({
      key: "status",
      node: (
        <StatTile
          label="Your website"
          value={down === 0 ? "Online" : "Having trouble"}
          hint={down === 0 ? `All checks passing on ${activeSite?.name}` : "We have been told and are looking"}
          tone={down === 0 ? "good" : "bad"}
        />
      ),
    });
  }
  if (can("visitors") && views > 0) {
    tiles.push({
      key: "visitors",
      node: <StatTile label="Visitors, last 14 days" value={views.toLocaleString("en-ZA")} hint="Bots not counted" />,
    });
  }
  if (can("store") && own?.modules.store && liveProducts > 0) {
    tiles.push({
      key: "products",
      node: <StatTile label="Products on sale" value={liveProducts} hint={`On ${activeSite?.name}`} />,
    });
  }
  if (can("billing") && dueInvoices.length > 0) {
    tiles.push({
      key: "invoices",
      node: (
        <StatTile
          label="Invoices due"
          value={dueInvoices.length}
          hint={dueInvoices[0]?.item}
          tone="warn"
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="type-title">Overview</h1>
        <p className="type-body text-muted-foreground">
          {firstName ? `Hi ${firstName}. ` : ""}
          {activeSite
            ? `Here is how ${activeSite.name} is doing.`
            : "Here is how your account is doing."}
        </p>
      </header>

      {sites.length === 0 ? (
        <>
          <SetupBanner />
          <Checklist />
          <NeedsYou />
        </>
      ) : (
        <>
          <NeedsYou />
          {tiles.length > 0 ? (
            <section
              aria-label="At a glance"
              className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]"
            >
              {tiles.map((t) => (
                <div key={t.key}>{t.node}</div>
              ))}
            </section>
          ) : (
            <p className="type-body text-muted-foreground">
              Numbers will show up here once your site starts getting visitors and enquiries.
            </p>
          )}
          <Checklist />
          <Shortcuts />
          <YourSites />
        </>
      )}
      <Upcoming />
    </div>
  );
}

/* ---------------------------------------------------------------- */

function SetupBanner() {
  return (
    <Surface className="flex items-start gap-4 border-gold bg-gold-soft p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-primary">
        <Hammer className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="type-section">Your website is being set up</h2>
        <p className="type-body text-muted-foreground">
          We are getting it ready for you. You can start on the steps below now. Services and
          gallery photos open up here as soon as your site is live.
        </p>
      </div>
    </Surface>
  );
}

type Step = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
  to: ClientLink;
  icon: LucideIcon;
};

/** What the client can do next, ticked off from their real data. */
function Checklist() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const sites = useOwnSites();
  const activeSite = useActiveSite();
  const users = useAscStore((s) => s.users);
  const media = useAscStore((s) => s.media);
  const products = useAscStore((s) => s.products);
  const sections = useAscStore((s) => s.sections);
  const can = (key: PermissionKey) => canUse(user, key);

  const steps: Step[] = [];
  if (own && can("business")) {
    steps.push({
      key: "business",
      label: "Add your business details",
      detail: "Phone, address and opening hours.",
      done: Boolean(own.phone || own.email || own.address || own.hours),
      to: "/business",
      icon: Building2,
    });
  }
  if (can("content") && activeSite) {
    const welcome = String(
      sections.find((s) => s.siteId === activeSite.id && s.key === "welcome")?.payload.line ?? "",
    ).trim();
    steps.push({
      key: "welcome",
      label: "Write your welcome line",
      detail: "The first thing visitors read on your homepage.",
      done: Boolean(welcome),
      to: "/content",
      icon: Globe,
    });
    if (own?.modules.services) {
      const items = sections.find((s) => s.siteId === activeSite.id && s.key === "services")
        ?.payload.items;
      steps.push({
        key: "services",
        label: "Add your services",
        detail: "Names, prices and a short description.",
        done: Array.isArray(items) && items.length > 0,
        to: "/content",
        icon: Globe,
      });
    }
    if (own?.modules.gallery) {
      const items = sections.find((s) => s.siteId === activeSite.id && s.key === "gallery")
        ?.payload.items;
      steps.push({
        key: "gallery",
        label: "Upload gallery photos",
        detail: "Show visitors your work.",
        done: Array.isArray(items) && items.length > 0,
        to: "/content",
        icon: Images,
      });
    }
  }
  if (own && can("content") && sites.length === 0) {
    steps.push({
      key: "photos",
      label: "Upload your photos",
      detail: "Keep them ready for your gallery.",
      done: media.some((m) => m.clientId === own.id),
      to: "/media",
      icon: Images,
    });
  }
  if (own?.modules.store && can("store")) {
    steps.push({
      key: "products",
      label: "Add your first product",
      detail: "Set a price and mark it live.",
      done: products.some((p) => p.clientId === own.id),
      to: "/store",
      icon: ShoppingBag,
    });
  }
  if (own && canManageTeam(user)) {
    steps.push({
      key: "team",
      label: "Invite your team",
      detail: "Give colleagues their own login.",
      done: users.filter((u) => u.role === "client" && u.clientId === own.id).length > 1,
      to: "/team",
      icon: Users,
    });
  }

  const done = steps.filter((s) => s.done).length;
  if (steps.length === 0 || done === steps.length) return null;

  return (
    <Surface>
      <SectionHeader
        inset
        title="Get your account ready"
        detail={`${done} of ${steps.length} done`}
      />
      <div className="px-5 pt-4">
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="p-2">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.to}
              className="flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/60"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  step.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card",
                )}
              >
                {step.done ? <Check className="size-3.5" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "type-body block font-medium",
                    step.done && "text-muted-foreground line-through",
                  )}
                >
                  {step.label}
                  {step.done ? <span className="sr-only"> (done)</span> : null}
                </span>
                <span className="type-small block text-muted-foreground">{step.detail}</span>
              </span>
              {!step.done ? (
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

/* ---------------------------------------------------------------- */

function NeedsYou() {
  const user = useCurrentUser();
  const can = (key: PermissionKey) => canUse(user, key);
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
  const welcomeLine = String(siteSections.find((s) => s.key === "welcome")?.payload.line ?? "").trim();
  const seoTitle = String(siteSections.find((s) => s.key === "seo")?.payload.title ?? "").trim();
  const ownAdverts = adverts.filter((a) => a.siteId === siteId);
  const live = ownAdverts.find((a) => a.status === "live" && a.startsOn <= today && a.endsOn >= today);
  const expired =
    ownAdverts.some((a) => a.status === "live" && a.endsOn < today) ||
    (!live && ownAdverts.some((a) => a.status === "expired"));
  const out = products.filter((p) => p.siteId === siteId && p.live && p.stock === 0);

  const items: { to: ClientLink; hash?: string; title: string; detail: string }[] = [];
  for (const e of can("enquiries") ? fresh : []) {
    items.push({ to: "/enquiries", title: `${e.name} sent an enquiry`, detail: e.message });
  }
  for (const inv of can("billing") ? dueInvoices : []) {
    items.push({ to: "/billing", title: `${inv.item} is due`, detail: `Invoice ${inv.ref}` });
  }
  for (const p of can("store") ? out : []) {
    items.push({ to: "/store", title: `${p.name} has sold out`, detail: "Hide it or add more stock." });
  }
  if (can("content") && siteId && own?.modules.advert && (!live || expired)) {
    items.push({
      to: "/content",
      title: expired ? "A picture on your site has run out" : "Your site has no pictures showing",
      detail: "Add a picture on Website and mark it live.",
    });
  }
  if (can("content") && siteId && !welcomeLine) {
    items.push({
      to: "/content",
      title: "Write a welcome line",
      detail: "Visitors see it first on your homepage.",
    });
  }
  if (can("content") && siteId && own?.modules.seo && !seoTitle) {
    items.push({
      to: "/content",
      hash: "seo",
      title: "Add a search title",
      detail: "It is what Google and social apps show for your site.",
    });
  }

  return (
    <Surface>
      <SectionHeader
        inset
        title="Needs you"
        action={items.length > 0 ? <Badge variant="staging">{items.length}</Badge> : undefined}
      />
      {items.length === 0 ? (
        <p className="type-body flex items-center gap-2 px-5 py-6 text-muted-foreground">
          <CircleCheck className="size-5 text-primary" aria-hidden="true" />
          You are all caught up. Nothing needs you right now.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, i) => (
            <li key={`${item.to}-${item.hash ?? ""}-${i}`}>
              <Link
                to={item.to}
                hash={item.hash}
                className="flex min-h-14 items-center justify-between gap-4 px-5 py-3 hover:bg-accent/50"
              >
                <span className="min-w-0">
                  <span className="type-body block font-medium">{item.title}</span>
                  <span className="type-small line-clamp-1 block text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <span className="type-small inline-flex shrink-0 items-center gap-1 font-medium text-primary">
                  Open
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

/* ---------------------------------------------------------------- */

function Shortcuts() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const activeSite = useActiveSite();
  const can = (key: PermissionKey) => canUse(user, key);
  const links: { to: ClientLink; label: string; detail: string; icon: LucideIcon }[] = [];
  if (can("content")) {
    links.push({
      to: "/content",
      label: "Edit your website",
      detail: activeSite ? `Change what visitors see on ${activeSite.name}.` : "Change what visitors see.",
      icon: Globe,
    });
  }
  if (own?.modules.store && can("store")) {
    links.push({ to: "/store", label: "Products", detail: "Prices, stock and photos.", icon: ShoppingBag });
  }
  if (own?.modules.calendar && can("calendar")) {
    links.push({ to: "/calendar", label: "Calendar", detail: "Dates, events and closed days.", icon: CalendarDays });
  }
  if (own?.modules.bookings && can("bookings")) {
    links.push({ to: "/bookings", label: "Bookings", detail: "Requests and reservations.", icon: CalendarCheck });
  }
  if (links.length === 0) return null;

  return (
    <section aria-label="Shortcuts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-surface)] transition-colors hover:bg-accent/50"
        >
          <l.icon className="size-5 text-primary" aria-hidden="true" />
          <p className="type-body mt-3 font-medium">{l.label}</p>
          <p className="type-small text-muted-foreground">{l.detail}</p>
        </Link>
      ))}
    </section>
  );
}

/* ---------------------------------------------------------------- */

function YourSites() {
  const sites = useOwnSites();
  const allMonitors = useAscStore((s) => s.monitors);
  const setActiveSite = useAscStore((s) => s.setActiveSite);
  const user = useCurrentUser();
  const showEdit = canUse(user, "content");

  return (
    <Surface>
      <SectionHeader inset title={sites.length > 1 ? "Your sites" : "Your site"} />
      <ul className="divide-y divide-border">
        {sites.map((site) => {
          const monitors = allMonitors.filter((m) => m.siteId === site.id);
          const down = monitors.some((m) => m.status === "down");
          const checked = monitors.some((m) => m.status !== "unchecked");
          const last = monitors
            .map((m) => m.lastCheckedAt)
            .filter((v): v is string => Boolean(v))
            .sort()
            .at(-1);
          const uptime = monitors.find((m) => m.uptime30 != null)?.uptime30;
          return (
            <li
              key={site.id}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="type-body font-medium">{site.name}</p>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="type-small inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground hover:underline sm:min-h-0"
                >
                  {site.url.replace(/^https?:\/\//, "")}
                </a>
              </div>
              <StatusBadge
                status={!checked ? "unchecked" : down ? "down" : "up"}
                label={!checked ? "Not checked yet" : down ? "Having trouble" : "Online"}
              />
              <p className="type-small text-muted-foreground">
                {uptime == null ? "No uptime figure yet" : `${uptime}% uptime`}
                {last ? ` · checked ${formatRelative(last)}` : ""}
              </p>
              {showEdit ? (
                <Button asChild size="sm" variant="outline">
                  <Link to="/content" onClick={() => setActiveSite(site.id)}>
                    Edit website
                  </Link>
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}

/* ---------------------------------------------------------------- */

function Upcoming() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const renewals = useAscStore((s) => s.renewals);
  const log = useAscStore((s) => s.log);
  const canBilling = canUse(user, "billing");

  const dueRenewals = useMemo(
    () =>
      renewals
        .filter((r) => r.clientId === own?.id)
        .slice()
        .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
        .slice(0, 4),
    [renewals, own?.id],
  );
  const changes = log.filter((l) => l.clientId === own?.id).slice(0, 5);
  if (dueRenewals.length === 0 && changes.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {dueRenewals.length > 0 ? (
        <Surface>
          <SectionHeader
            inset
            title="Coming up for renewal"
            action={
              canBilling ? (
                <Button asChild size="sm" variant="outline">
                  <Link to="/billing">Billing</Link>
                </Button>
              ) : undefined
            }
          />
          <ul className="divide-y divide-border">
            {dueRenewals.map((r) => {
              const days = differenceInCalendarDays(parseISO(r.expiresAt), new Date());
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="type-body truncate font-medium">{r.item}</p>
                    <p className="type-small capitalize text-muted-foreground">{r.type}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="type-body">{formatDay(r.expiresAt)}</p>
                    <p className="type-small text-muted-foreground">
                      {days < 0 ? "Overdue" : days === 0 ? "Today" : `in ${days} days`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Surface>
      ) : null}
      {changes.length > 0 ? (
        <Surface>
          <SectionHeader inset title="Recent changes" />
          <ul className="divide-y divide-border">
            {changes.map((l) => (
              <li key={l.id} className="px-5 py-3">
                <p className="type-body">{l.summary}</p>
                <p className="type-small text-muted-foreground">
                  {l.actor} · {formatRelative(l.at)}
                </p>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </div>
  );
}
