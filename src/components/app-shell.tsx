import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  FilePen,
  Globe,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ClientJump } from "@/components/client-jump";
import { PaymentBanner } from "@/components/billing/payment-banner";
import { CookieBanner } from "@/components/cookie-banner";
import { ErrorPanel } from "@/components/error-panel";
import { LoginScreen } from "@/components/login-screen";
import { AscLockup, AscLogo } from "@/components/logo";
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
import { canManageTeam, canUse, type PermissionKey } from "@/lib/permissions";
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

/** The page background for each desk. Also the installed window's title bar. */
const CANVAS = { client: "#f3f5f4", staff: "#f6f1e4" } as const;

const SUPPORT_EMAIL = "admin@ascsoftware.co.za";

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

type StaffNavItem = {
  to: "/" | "/clients" | "/sites" | "/monitors" | "/incidents" | "/renewals" | "/visitors" | "/requests" | "/admin";
  label: string;
  icon: LucideIcon;
  badge?: "incidents" | "requests";
};

const STAFF_GROUPS: { label: string | null; items: StaffNavItem[] }[] = [
  { label: null, items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Book",
    items: [
      { to: "/clients", label: "Clients", icon: Building2 },
      { to: "/sites", label: "Sites", icon: Globe },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/monitors", label: "Monitors", icon: Activity },
      { to: "/incidents", label: "Incidents", icon: TriangleAlert, badge: "incidents" },
      { to: "/renewals", label: "Renewals", icon: CalendarClock },
      { to: "/requests", label: "Requests", icon: LifeBuoy, badge: "requests" },
      { to: "/visitors", label: "Visitors", icon: Users },
    ],
  },
  { label: "Team", items: [{ to: "/admin", label: "Admin", icon: ShieldCheck }] },
];

const STAFF_JUMP_ITEMS = STAFF_GROUPS.flatMap((g) =>
  g.items.map(({ to, label }) => ({ to, label })),
);

type ClientSection = "top" | "shop" | "inbox" | "account";

type ClientNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  section: ClientSection;
  badge?: "enquiries";
  module?: ModuleKey;
  /** The page a staff login needs ticked. Account admins always have it. */
  perm?: PermissionKey;
  /** Shown to account admins only. */
  adminOnly?: boolean;
};

/**
 * Add a page here and it appears in the right group. Website extras (gallery,
 * services and so on) are tabs on the Website page, not sidebar items.
 */
const CLIENT_NAV: ClientNavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, section: "top" },
  { to: "/content", label: "Website", icon: Globe, section: "top", perm: "content" },
  { to: "/store", label: "Store", icon: ShoppingBag, section: "shop", module: "store", perm: "store" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, section: "shop", module: "calendar", perm: "calendar" },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck, section: "shop", module: "bookings", perm: "bookings" },
  { to: "/enquiries", label: "Enquiries", icon: Inbox, section: "inbox", badge: "enquiries", perm: "enquiries" },
  { to: "/visitors", label: "Visitors", icon: Users, section: "inbox", perm: "visitors" },
  { to: "/business", label: "Business", icon: Building2, section: "account", perm: "business" },
  { to: "/billing", label: "Billing", icon: Wallet, section: "account", perm: "billing" },
  { to: "/team", label: "Team", icon: ShieldCheck, section: "account", adminOnly: true },
  { to: "/requests", label: "Ask ASC", icon: LifeBuoy, section: "account", perm: "requests" },
];

/**
 * Links that leave ASC Manager and open in a new tab. They are not pages, so
 * they are never the active route, and they sit outside the module toggles
 * and permissions: every client sees them.
 */
const CLIENT_TOOLS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "https://ledgerly.ascsoftware.co.za/", label: "Business Manager", icon: Briefcase },
  { href: "https://pdfedit.ascsoftware.co.za/", label: "PDF Editor", icon: FilePen },
];

const SECTION_LABEL: Partial<Record<ClientSection, string>> = {
  shop: "Shop",
  inbox: "Inbox",
  account: "Account",
};

function visibleClientNav(
  client: ReturnType<typeof useOwnClient>,
  user: ReturnType<typeof useCurrentUser>,
): ClientNavItem[] {
  return CLIENT_NAV.filter((item) => {
    if (item.adminOnly && !canManageTeam(user)) return false;
    if (item.perm && !canUse(user, item.perm)) return false;
    if (!item.module) return true;
    if (!client) return false;
    return client.modules[item.module];
  });
}

/** What the Ctrl K search can open: every visible page plus enabled website extras. */
function clientJumpItems(
  client: ReturnType<typeof useOwnClient>,
  user: ReturnType<typeof useCurrentUser>,
) {
  const items: { to: string; label: string; hash?: string }[] = [];
  for (const item of visibleClientNav(client, user)) {
    items.push({ to: item.to, label: item.label });
    if (item.to === "/content" && client) {
      for (const mod of WEBSITE_MODULE_TOGGLES) {
        if (client.modules[mod.key]) {
          items.push({ to: "/content", hash: mod.key, label: `Website: ${mod.label}` });
        }
      }
    }
  }
  return items;
}

function isActive(to: string, pathname: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
  count,
  tone = "primary",
  external = false,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  count?: number;
  tone?: "primary" | "bad" | "warn";
  /** `to` is a full URL that opens in a new tab. It is never the active page. */
  external?: boolean;
  onNavigate?: () => void;
}) {
  const className = cn(
    "type-body relative flex min-h-9 items-center gap-3 rounded-lg px-3 font-medium transition-colors duration-150 max-lg:min-h-11",
    active
      ? "bg-accent text-foreground"
      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener" onClick={onNavigate} className={className}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">
          {label}
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link
      to={to}
      onClick={onNavigate}
      preload="intent"
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {active ? (
        <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold" />
      ) : null}
      <Icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden="true" />
      <span className="flex-1 truncate">{label}</span>
      {count ? (
        <span
          className={cn(
            "min-w-5 rounded-full px-1.5 text-center text-xs font-semibold leading-5",
            tone === "bad" && "bg-destructive text-destructive-foreground",
            tone === "warn" && "bg-warn text-primary-foreground",
            tone === "primary" && "bg-primary text-primary-foreground",
          )}
        >
          <span className="sr-only">, </span>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function NavLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("type-label px-3 pb-1 pt-4", className)}>{children}</p>;
}

/** The client menu has one more group than a phone screen has room for, so its headings sit closer on small screens. */
const CLIENT_LABEL = "max-lg:pt-2";

function SignOutButton() {
  const signOut = useAscStore((s) => s.signOut);
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="type-body flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left font-medium text-muted-foreground hover:bg-accent/70 hover:text-foreground max-lg:min-h-11"
      onClick={() => {
        void signOut().then(() => navigate({ to: "/" }));
      }}
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      Sign out
    </button>
  );
}

/** No inner scrollbar: the layout is sized to fit. This only guards very short windows. */
const SIDEBAR_BODY =
  "flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function StaffSidebar({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  const openIncidents = useAscStore((s) => s.incidents.filter((i) => i.status === "open").length);
  const openRequests = useAscStore((s) => s.requests.filter((r) => r.status === "open").length);
  const counts = { incidents: openIncidents, requests: openRequests };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-4">
      <AscLockup caption="Staff console" className="shrink-0 pb-2" />
      <nav aria-label="Staff console" className={SIDEBAR_BODY}>
        {STAFF_GROUPS.map((group, gi) => (
          <div key={group.label ?? gi}>
            {group.label ? <NavLabel>{group.label}</NavLabel> : null}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.to, current)}
                  count={item.badge ? counts[item.badge] : 0}
                  tone={item.badge === "incidents" ? "bad" : "warn"}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-border pt-2">
        <SignOutButton />
      </div>
    </div>
  );
}

function ClientSidebar({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  const user = useCurrentUser();
  const client = useOwnClient();
  const sites = useOwnSites();
  const activeSite = useActiveSite();
  const newEnquiries = useAscStore(
    (s) => s.enquiries.filter((e) => e.clientId === user?.clientId && e.status === "new").length,
  );
  const items = visibleClientNav(client, user);
  const liveSite = activeSite?.kind === "public" ? activeSite : sites[0];

  const renderItem = (item: ClientNavItem) => (
    <NavItem
      key={item.to}
      to={item.to}
      label={item.label}
      icon={item.icon}
      active={isActive(item.to, current)}
      count={item.badge === "enquiries" ? newEnquiries : 0}
      onNavigate={onNavigate}
    />
  );
  const middle = (["top", "shop", "inbox"] as const).filter((s) =>
    items.some((i) => i.section === s),
  );
  const account = items.filter((i) => i.section === "account");

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-4 max-lg:gap-1">
      <AscLockup className="shrink-0 pb-2" />
      <nav aria-label="Main" className={SIDEBAR_BODY}>
        {middle.map((section) => (
          <div key={section}>
            {SECTION_LABEL[section] ? (
              <NavLabel className={CLIENT_LABEL}>{SECTION_LABEL[section]}</NavLabel>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {items.filter((i) => i.section === section).map(renderItem)}
            </div>
          </div>
        ))}
        <div>
          <NavLabel className={CLIENT_LABEL}>Tools</NavLabel>
          <div className="flex flex-col gap-0.5">
            {CLIENT_TOOLS.map((tool) => (
              <NavItem
                key={tool.href}
                to={tool.href}
                label={tool.label}
                icon={tool.icon}
                active={false}
                external
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </nav>
      <div className="shrink-0 border-t border-border pt-1">
        {account.length > 0 ? (
          <nav aria-label="Account">
            <NavLabel className={CLIENT_LABEL}>Account</NavLabel>
            <div className="flex flex-col gap-0.5">{account.map(renderItem)}</div>
          </nav>
        ) : null}
        <div className="mt-1 flex flex-col gap-0.5">
          {liveSite?.url ? (
            <a
              href={liveSite.url}
              target="_blank"
              rel="noreferrer"
              className="type-body flex min-h-9 items-center gap-3 rounded-lg px-3 font-medium text-primary hover:bg-accent/70 max-lg:min-h-11"
            >
              <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
              View live site
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header pieces                                                       */
/* ------------------------------------------------------------------ */

/** Lets a client who runs several sites choose which one they are working on. */
function SiteSwitcher() {
  const user = useCurrentUser();
  const sites = useOwnSites();
  const activeSite = useActiveSite();
  const client = useOwnClient();
  const setActiveSite = useAscStore((s) => s.setActiveSite);
  const name = activeSite?.name || client?.name || "";
  if (user?.role !== "client") return null;

  if (sites.length < 2) {
    return <p className="type-body min-w-0 truncate font-medium sm:hidden">{name}</p>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Site: ${name}. Switch site`}
          className="type-body inline-flex min-h-10 min-w-0 max-w-[12rem] items-center gap-2 rounded-lg border border-input bg-card px-3 font-medium hover:bg-accent max-sm:min-h-11 max-sm:max-w-[9rem]"
        >
          <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{name}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch site</DropdownMenuLabel>
        {sites.map((site) => (
          <DropdownMenuItem key={site.id} onClick={() => setActiveSite(site.id)}>
            <span className="min-w-0 flex-1 truncate">{site.name}</span>
            {activeSite?.id === site.id ? (
              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const user = useCurrentUser();
  const signOut = useAscStore((s) => s.signOut);
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="type-body inline-flex min-h-11 items-center gap-2 rounded-lg px-1 font-medium hover:bg-accent sm:px-2"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials(user.name) || "•"}
          </span>
          <span className="hidden max-w-[10rem] truncate sm:inline">{user.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === "operator" ? (
          <DropdownMenuItem onClick={() => void navigate({ to: "/admin" })}>Admin</DropdownMenuItem>
        ) : (
          <>
            {canUse(user, "business") ? (
              <DropdownMenuItem onClick={() => void navigate({ to: "/business" })}>
                Business
              </DropdownMenuItem>
            ) : null}
            {canManageTeam(user) ? (
              <DropdownMenuItem onClick={() => void navigate({ to: "/team" })}>Team</DropdownMenuItem>
            ) : null}
          </>
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

function Footer() {
  return (
    <footer className="mt-auto border-t border-border px-4 py-4 sm:px-8">
      <div className="type-small mx-auto flex w-full max-w-[72rem] flex-wrap items-center justify-between gap-x-6 gap-y-2 text-muted-foreground">
        <p>© Atlas Scale Collective (Pty) Ltd · Pretoria</p>
        <nav aria-label="Legal and support" className="flex flex-wrap gap-x-5 gap-y-1">
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-foreground hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </nav>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function HydrateGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useAscStore.getState().bootstrap();
  }, []);
  return <>{children}</>;
}

function Splash() {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background text-foreground"
    >
      <AscLogo className="size-16" />
      <p className="type-small animate-pulse text-muted-foreground">Loading…</p>
    </div>
  );
}

function SkipLink() {
  return (
    <a
      href="#main"
      className="type-body sr-only rounded-lg bg-card px-4 py-2 font-medium shadow-[var(--shadow-lift)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60]"
    >
      Skip to content
    </a>
  );
}

function SignOutInline() {
  const signOut = useAscStore((s) => s.signOut);
  const navigate = useNavigate();
  return (
    <Button
      variant="outline"
      onClick={() => {
        void signOut().then(() => navigate({ to: "/" }));
      }}
    >
      Sign out
    </Button>
  );
}

function LoadProblem({ withSignOut }: { withSignOut?: boolean }) {
  return (
    <ErrorPanel
      title="We could not load your workspace"
      detail="Check your connection and try again. If it keeps happening, email us and we will sort it out."
      onRetry={() => {
        void useAscStore.getState().hydrateFromSession();
      }}
    >
      {withSignOut ? <SignOutInline /> : null}
    </ErrorPanel>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useCurrentUser();
  const session = useSession();
  const client = useOwnClient();
  const ready = useStoreReady();
  const hydrating = useHydrating();
  const loadError = useAscStore((s) => s.loadError);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLegal = pathname === "/privacy" || pathname === "/terms";
  const isClient = user?.role === "client";
  const isStaff = Boolean(user) && !isClient;

  const page =
    hydrating && !isLegal ? (
      <PageSkeleton />
    ) : loadError && user && !isLegal ? (
      <LoadProblem />
    ) : (
      children
    );

  useEffect(() => {
    document.documentElement.classList.toggle("staff-desk", isStaff);
    return () => document.documentElement.classList.remove("staff-desk");
  }, [isStaff]);

  // The installed window's title bar follows the canvas, never black.
  useEffect(() => {
    const colour = isStaff ? CANVAS.staff : CANVAS.client;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = colour;
  }, [isStaff]);

  const brokenSession = Boolean(loadError && session && !user && !hydrating && !isLegal);

  return (
    <HydrateGate>
      <TooltipProvider delayDuration={200}>
        {!ready && !isLegal ? (
          <Splash />
        ) : (loadError && !session && !isLegal) || brokenSession ? (
          <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
              <LoadProblem withSignOut={Boolean(session)} />
            </div>
          </div>
        ) : !session && !isLegal ? (
          <div className="min-h-dvh bg-background">
            <LoginScreen />
            <CookieBanner />
            <Toaster theme="light" />
          </div>
        ) : (
          <div className="min-h-dvh bg-background text-foreground">
            <SkipLink />
            {user ? (
              <aside
                aria-label="Sidebar"
                className="fixed inset-y-0 left-0 hidden h-dvh w-64 overflow-hidden border-r border-border bg-sidebar lg:block"
              >
                {isClient ? (
                  <ClientSidebar current={pathname} />
                ) : (
                  <StaffSidebar current={pathname} />
                )}
              </aside>
            ) : null}
            <div className={cn("flex min-h-dvh flex-col", user && "lg:pl-64")}>
              <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
                {user ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open menu"
                  >
                    <Menu className="size-5" aria-hidden="true" />
                  </Button>
                ) : (
                  <AscLockup />
                )}
                {user ? (
                  <>
                    <div className="hidden min-w-0 flex-1 sm:flex">
                      <ClientJump
                        items={isClient ? clientJumpItems(client, user) : STAFF_JUMP_ITEMS}
                      />
                    </div>
                    <SiteSwitcher />
                  </>
                ) : null}
                <div className="ml-auto">{user ? <UserMenu /> : null}</div>
              </header>
              {isClient ? <PaymentBanner /> : null}
              <main
                id="main"
                className="mx-auto w-full max-w-[72rem] flex-1 px-4 py-6 sm:px-8 sm:py-8"
              >
                {page}
              </main>
              <Footer />
            </div>
            {user ? (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="left" className="w-72 overflow-hidden p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  {isClient ? (
                    <ClientSidebar current={pathname} onNavigate={() => setMenuOpen(false)} />
                  ) : (
                    <StaffSidebar current={pathname} onNavigate={() => setMenuOpen(false)} />
                  )}
                </SheetContent>
              </Sheet>
            ) : null}
            <CookieBanner />
            <Toaster theme="light" />
          </div>
        )}
      </TooltipProvider>
    </HydrateGate>
  );
}
