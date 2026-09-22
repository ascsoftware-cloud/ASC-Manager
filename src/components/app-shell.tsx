import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  FileText,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  ShoppingBag,
  Users,
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
import {
  useAscStore,
  useCurrentUser,
  useHydrating,
  useOwnClient,
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

const CLIENT_NAV: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "enquiries";
  module?: "store" | "calendar" | "bookings";
}[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/content", label: "Website", icon: FileText },
  { to: "/store", label: "Store", icon: ShoppingBag, module: "store" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, module: "calendar" },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck, module: "bookings" },
  { to: "/enquiries", label: "Enquiries", icon: Inbox, badge: "enquiries" },
  { to: "/visitors", label: "Visitors", icon: Users },
  { to: "/billing", label: "Billing", icon: Wallet },
  { to: "/requests", label: "Ask ASC", icon: LifeBuoy },
  { to: "/business", label: "Business", icon: Building2 },
];

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
  onNavigate,
}: {
  current: string;
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
      {items.map((item) => {
        const active =
          item.to === "/"
            ? current === "/"
            : current === item.to || current.startsWith(`${item.to}/`);
        const Icon = item.icon;
        const badge = item.badge === "enquiries" && newEnquiries > 0 ? newEnquiries : 0;
        return (
          <Link
            key={item.to}
            to={item.to}
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
        );
      })}
    </nav>
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
          className={cn(
            "inline-flex min-h-11 items-center gap-2 text-champagne",
            user.role === "client"
              ? "text-sm font-medium"
              : "text-[11px] uppercase tracking-[0.16em]",
          )}
        >
          {user.role === "client" ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(user.name) || "•"}
            </span>
          ) : null}
          <span className="hidden sm:inline">{user.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
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

function ClientSidebar({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  const client = useOwnClient();
  const signOut = useAscStore((s) => s.signOut);
  const navigate = useNavigate();
  const liveSite = useAscStore((s) =>
    s.sites.find((site) => site.clientId === client?.id && site.kind === "public"),
  );

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <AscLockup />
      <div className="rounded-2xl bg-card px-3 py-3 shadow-[var(--shadow-lift)]">
        <p className="text-xs font-medium text-muted-foreground">Your site</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{client?.name}</p>
        <p className="truncate text-xs text-muted-foreground">{client?.city}</p>
      </div>
      <ClientNav current={current} onNavigate={onNavigate} />
      <div className="mt-auto space-y-2 pt-4">
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
  const user = useCurrentUser();
  const session = useSession();
  const client = useOwnClient();
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
            <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-sidebar lg:block">
              <ClientSidebar current={pathname} />
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
                  {client?.name}
                </p>
                <div className="hidden min-w-0 flex-1 sm:flex">
                  <ClientJump items={visibleClientNav(client).map(({ to, label }) => ({ to, label }))} />
                </div>
                <div className="ml-auto">
                  <UserMenu />
                </div>
              </header>
              <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{page}</main>
              <Footer />
            </div>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="left" className="client-desk w-64 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <ClientSidebar current={pathname} onNavigate={() => setMenuOpen(false)} />
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
