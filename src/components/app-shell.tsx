import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  FileText,
  Images,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Quote,
  Search,
  ShoppingBag,
  Tags,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { ClientJump } from "@/components/client-jump";
import { CookieBanner } from "@/components/cookie-banner";
import { LoginScreen } from "@/components/login-screen";
import { AscLockup } from "@/components/logo";
import { PageSkeleton } from "@/components/page-skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initials } from "@/lib/format";
import { WEBSITE_MODULE_TOGGLES, type ModuleKey } from "@/lib/modules";
import {
  useActiveSite,
  useAscStore,
  useCurrentUser,
  useHydrating,
  useOwnClient,
  useOwnSites,
  useSession,
  useStoreReady,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const STAFF_NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/sites", label: "Sites" },
  { to: "/monitors", label: "Monitors" },
  { to: "/incidents", label: "Incidents" },
  { to: "/renewals", label: "Renewals" },
  { to: "/visitors", label: "Visitors" },
  { to: "/requests", label: "Requests" },
] as const;

const WEBSITE_NAV_ICONS = {
  seo: Search,
  faq: CircleHelp,
  testimonials: Quote,
  gallery: Images,
  services: Tags,
  staff: UsersRound,
} as const;

const NAV_GROUPS = {
  site: "This site",
  shop: "Shop",
  inbox: "Inbox",
  account: "Account",
} as const;

type NavGroup = keyof typeof NAV_GROUPS;

const CLIENT_NAV: {
  to: string;
  hash?: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "enquiries";
  module?: ModuleKey;
  group?: NavGroup;
}[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/content", label: "Website", icon: FileText, group: "site" },
  ...WEBSITE_MODULE_TOGGLES.map((mod) => ({
    to: "/content",
    hash: mod.key,
    label: mod.label,
    icon: WEBSITE_NAV_ICONS[mod.key],
    module: mod.key,
    group: "site" as const,
  })),
  { to: "/store", label: "Store", icon: ShoppingBag, module: "store", group: "shop" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, module: "calendar", group: "shop" },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck, module: "bookings", group: "shop" },
  { to: "/enquiries", label: "Enquiries", icon: Inbox, badge: "enquiries", group: "inbox" },
  { to: "/visitors", label: "Visitors", icon: Users, group: "inbox" },
  { to: "/business", label: "Business", icon: Building2, group: "account" },
  { to: "/billing", label: "Billing", icon: Wallet, group: "account" },
  { to: "/requests", label: "Ask ASC", icon: LifeBuoy, group: "account" },
];

function clientNavActive(
  item: (typeof CLIENT_NAV)[number],
  pathname: string,
  hash: string,
): boolean {
  if (item.to === "/") return pathname === "/";
  if (item.hash) {
    return (pathname === item.to || pathname.startsWith(`${item.to}/`)) && hash === item.hash;
  }
  if (item.to === "/content") {
    return (pathname === "/content" || pathname.startsWith("/content/")) && !hash;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function StaffNav({
  current,
  onNavigate,
  stacked,
}: {
  current: string;
  onNavigate?: () => void;
  stacked?: boolean;
}) {
  return (
    <nav className={cn("flex gap-0", stacked ? "flex-col gap-1" : "flex-row items-center")}>
      {STAFF_NAV.map((item) => {
        const active =
          item.to === "/"
            ? current === "/"
            : current === item.to || current.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            preload="intent"
            className={cn(
              "relative flex min-h-11 items-center px-2.5 text-[11px] uppercase tracking-[0.14em] transition-colors",
              active ? "text-champagne" : "text-muted-foreground hover:text-champagne",
            )}
          >
            {item.label}
            {active && !stacked ? (
              <span className="absolute inset-x-3 -bottom-px hidden h-px bg-emerald lg:block" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function visibleClientNav(client: ReturnType<typeof useOwnClient>) {
  return CLIENT_NAV.filter((item) => {
    if (!item.module) return true;
    if (!client) return false;
    return client.modules[item.module];
  });
}

function ClientNav({
  current,
  hash,
  onNavigate,
}: {
  current: string;
  hash: string;
  onNavigate?: () => void;
}) {
  const user = useCurrentUser();
  const client = useOwnClient();
  const newEnquiries = useAscStore(
    (s) => s.enquiries.filter((e) => e.clientId === user?.clientId && e.status === "new").length,
  );
  const items = visibleClientNav(client);

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item, i) => {
        const active = clientNavActive(item, current, hash);
        const Icon = item.icon;
        const badge = item.badge === "enquiries" && newEnquiries > 0 ? newEnquiries : 0;
        const showGroup = Boolean(item.group && item.group !== items[i - 1]?.group);
        return (
          <div key={`${item.to}#${item.hash ?? ""}`}>
            {showGroup && item.group ? (
              <p className="px-3 pb-1 pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground first:pt-1">
                {NAV_GROUPS[item.group]}
              </p>
            ) : null}
            <Link
              to={item.to}
              hash={item.hash}
              onClick={onNavigate}
              preload="intent"
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-card text-foreground shadow-[var(--shadow-lift)]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active ? "text-emerald" : "")} />
              <span className="flex-1">{item.label}</span>
              {badge ? (
                <span className="rounded-full bg-emerald px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {badge}
                </span>
              ) : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const user = useCurrentUser();
  const signOut = useAscStore((s) => s.signOut);
  const navigate = useNavigate();
  const sites = useOwnSites();
  const activeSite = useActiveSite();
  const setActiveSite = useAscStore((s) => s.setActiveSite);
  if (!user) return null;
  const switchable = user.role === "client" && sites.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-11 items-center gap-2 text-champagne",
            user.role === "client"
              ? "text-sm font-medium"
              : "text-[11px] uppercase tracking-[0.16em]",
          )}
        >
          {user.role === "client" ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(activeSite?.name || user.name) || "•"}
            </span>
          ) : null}
          <span className="hidden sm:inline">{activeSite?.name || user.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={switchable ? "w-64" : "w-52"}>
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        {switchable ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Sites</DropdownMenuLabel>
            {sites.map((site) => (
              <DropdownMenuItem key={site.id} onClick={() => setActiveSite(site.id)}>
                <span className="min-w-0 flex-1 truncate">{site.name}</span>
                {activeSite?.id === site.id ? (
                  <Check className="size-4 shrink-0 text-emerald" />
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}
        {user.role === "operator" ? (
          <DropdownMenuItem onClick={() => void navigate({ to: "/admin" })}>
            Admin
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => void navigate({ to: "/business" })}>
            Business
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void signOut().then(() => navigate({ to: "/" }));
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Footer({ padded }: { padded?: boolean }) {
  const [ms] = useState(() => (7 + Math.random() * 3).toFixed(1));
  return (
    <footer
      className={cn(
        "mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-8",
        padded && "lg:pl-8",
      )}
    >
      <p>Atlas Scale Collective (Pty) Ltd · Pretoria, South Africa</p>
      <p>Local · {ms} ms</p>
    </footer>
  );
}

function HydrateGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useAscStore.getState().bootstrap();
  }, []);
  return <>{children}</>;
}

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background text-champagne">
      <AscLockup size="lg" />
      <p className="animate-pulse text-[11px] uppercase tracking-[0.22em] text-emerald">
        Loading
      </p>
    </div>
  );
}

function ClientSidebar({
  current,
  hash,
  onNavigate,
}: {
  current: string;
  hash: string;
  onNavigate?: () => void;
}) {
  const client = useOwnClient();
  const sites = useOwnSites();
  const activeSite = useActiveSite();
  const setActiveSite = useAscStore((s) => s.setActiveSite);
  const signOut = useAscStore((s) => s.signOut);
  const navigate = useNavigate();
  const liveSite = activeSite?.kind === "public" ? activeSite : sites[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-4">
      <div className="shrink-0 space-y-5">
        <AscLockup />
        <div className="rounded-2xl bg-card px-3 py-3 shadow-[var(--shadow-lift)]">
          <p className="text-xs font-medium text-muted-foreground">
            {sites.length > 1 ? "Working on" : "Your site"}
          </p>
          {sites.length > 1 ? (
            <label className="mt-1 block">
              <span className="sr-only">Switch site</span>
              <select
                className="mt-0.5 w-full truncate rounded-lg bg-background px-2 py-1.5 text-sm font-semibold text-foreground"
                value={activeSite?.id ?? ""}
                onChange={(e) => setActiveSite(e.target.value)}
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {activeSite?.name || client?.name}
            </p>
          )}
          <p className="truncate text-xs text-muted-foreground">{client?.city}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
        <ClientNav current={current} hash={hash} onNavigate={onNavigate} />
      </div>
      <div className="shrink-0 space-y-2 border-t border-border pt-3">
        {liveSite?.url ? (
          <a
            href={liveSite.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-emerald hover:bg-accent"
          >
            <ExternalLink className="size-4" />
            View live site
          </a>
        ) : null}
        <button
          type="button"
          className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => {
            void signOut().then(() => navigate({ to: "/" }));
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({
    select: (s) => (s.location.hash || "").replace(/^#/, ""),
  });
  const user = useCurrentUser();
  const session = useSession();
  const client = useOwnClient();
  const activeSite = useActiveSite();
  const ready = useStoreReady();
  const hydrating = useHydrating();
  const loadError = useAscStore((s) => s.loadError);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLegal = pathname === "/privacy" || pathname === "/terms";
  const isClient = user?.role === "client";
  const toastTheme = isClient ? "light" : "dark";
  const page =
    hydrating && !isLegal ? (
      <PageSkeleton />
    ) : loadError && user && !isLegal ? (
      <p className="text-sm text-destructive">{loadError}</p>
    ) : (
      children
    );

  useEffect(() => {
    const root = document.documentElement;
    if (isClient) root.classList.add("client-desk");
    else root.classList.remove("client-desk");
    return () => root.classList.remove("client-desk");
  }, [isClient]);

  return (
    <HydrateGate>
      <TooltipProvider delayDuration={200}>
        {!ready && !isLegal ? (
          <Splash />
        ) : loadError && !session && !isLegal ? (
          <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
          </div>
        ) : loadError && session && !user && !hydrating && !isLegal ? (
          <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
          </div>
        ) : !session && !isLegal ? (
          <div className="min-h-dvh bg-background">
            <LoginScreen />
            <CookieBanner />
            <Toaster theme={toastTheme} />
          </div>
        ) : isClient ? (
          <div className="client-desk min-h-dvh bg-background text-foreground">
            <aside className="fixed inset-y-0 left-0 hidden h-dvh w-64 overflow-hidden border-r border-border bg-sidebar lg:block">
              <ClientSidebar current={pathname} hash={hash} />
            </aside>
            <div className="flex min-h-dvh flex-col lg:pl-64">
              <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:px-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </Button>
                <p className="truncate text-sm font-medium text-champagne lg:hidden">
                  {activeSite?.name || client?.name}
                </p>
                <div className="hidden min-w-0 flex-1 sm:flex">
                  <ClientJump
                    items={visibleClientNav(client).map(({ to, label, hash: itemHash }) => ({
                      to,
                      label,
                      hash: itemHash,
                    }))}
                  />
                </div>
                <div className="ml-auto">
                  <UserMenu />
                </div>
              </header>
              <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{page}</main>
              <Footer />
            </div>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="left" className="client-desk h-dvh w-64 overflow-hidden p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <ClientSidebar
                  current={pathname}
                  hash={hash}
                  onNavigate={() => setMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <CookieBanner />
            <Toaster theme={toastTheme} />
          </div>
        ) : (
          <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
              <div className="flex h-14 items-center gap-3 px-3 sm:px-6">
                {user ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open menu"
                  >
                    <Menu className="size-5" />
                  </Button>
                ) : null}
                <AscLockup />
                {user ? (
                  <div className="ml-4 hidden min-w-0 flex-1 overflow-x-auto lg:block">
                    <StaffNav current={pathname} />
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="ml-auto">{user ? <UserMenu /> : null}</div>
              </div>
            </header>
            <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">{page}</main>
            <Footer />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="left" className="p-6">
                <SheetHeader>
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                </SheetHeader>
                <AscLockup />
                <div className="mt-8">
                  <StaffNav
                    current={pathname}
                    stacked
                    onNavigate={() => setMenuOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <CookieBanner />
            <Toaster theme={toastTheme} />
          </div>
        )}
      </TooltipProvider>
    </HydrateGate>
  );
}
