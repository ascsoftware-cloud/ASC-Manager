import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  FileText,
  Image,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { CookieBanner } from "@/components/cookie-banner";
import { LoginScreen } from "@/components/login-screen";
import { AscLockup } from "@/components/logo";
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
import { useAscStore, useCurrentUser, useOwnClient, useStoreReady } from "@/lib/store";
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
  { to: "/media", label: "Photos", icon: Image },
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
  const items = CLIENT_NAV.filter((item) => {
    if (!item.module) return true;
    if (!client) return false;
    return client.modules[item.module];
  });

  return (
    <nav className="flex flex-col gap-1">
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
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
              active
                ? "border-l-2 border-l-emerald bg-accent text-champagne"
                : "border-l-2 border-l-transparent text-muted-foreground hover:bg-accent/60 hover:text-champagne",
            )}
          >
            <Icon className={cn("size-4", active ? "text-emerald" : "")} />
            <span className={cn("flex-1", active && "text-champagne")}>
              {item.to === "/content" && client?.modules.advert ? "Advert" : item.label}
            </span>
            {badge ? (
              <span className="rounded-full bg-emerald px-1.5 py-0.5 text-[10px] font-medium text-ink">
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
          className="inline-flex min-h-11 items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-champagne"
        >
          {user.name}
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
    <div className="flex min-h-dvh items-center justify-center bg-background text-champagne">
      <p className="text-[11px] uppercase tracking-[0.22em] text-emerald">Loading</p>
    </div>
  );
}

function ClientSidebar({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  const client = useOwnClient();
  const signOut = useAscStore((s) => s.signOut);
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <AscLockup />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald">Your site</p>
        <p className="mt-1 font-display text-xl text-champagne">{client?.name}</p>
        <p className="text-xs text-muted-foreground">{client?.city}</p>
      </div>
      <ClientNav current={current} onNavigate={onNavigate} />
      <div className="mt-auto space-y-3 pt-4">
        <div className="rounded-md bg-muted/70 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">Powered by ASC</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You run the site. Your customers see the public side.
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 text-left text-sm text-muted-foreground hover:text-champagne"
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
  const client = useOwnClient();
  const ready = useStoreReady();
  const loadError = useAscStore((s) => s.loadError);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLegal = pathname === "/privacy" || pathname === "/terms";
  const isClient = user?.role === "client";

  return (
    <HydrateGate>
      <TooltipProvider delayDuration={200}>
        {!ready && !isLegal ? (
          <Splash />
        ) : loadError && !user && !isLegal ? (
          <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
          </div>
        ) : !user && !isLegal ? (
          <div className="min-h-dvh bg-background">
            <LoginScreen />
            <CookieBanner />
            <Toaster />
          </div>
        ) : isClient ? (
          <div className="min-h-dvh bg-background text-foreground">
            <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-sidebar lg:block">
              <ClientSidebar current={pathname} />
            </aside>
            <div className="flex min-h-dvh flex-col lg:pl-60">
              <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm sm:px-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </Button>
                <p className="truncate text-sm text-champagne lg:hidden">
                  {client?.name}
                </p>
                <div className="ml-auto">
                  <UserMenu />
                </div>
              </header>
              <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
              <Footer />
            </div>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="left" className="w-60 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <ClientSidebar current={pathname} onNavigate={() => setMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <CookieBanner />
            <Toaster />
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
            <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
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
            <Toaster />
          </div>
        )}
      </TooltipProvider>
    </HydrateGate>
  );
}
