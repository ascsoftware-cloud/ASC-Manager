import { StatTile } from "@/components/ui/stat-tile";
import { Surface } from "@/components/ui/surface";
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/data-table";
import { PermissionGate } from "@/components/permission-gate";
import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { NativeSelect, PageHeader } from "@/components/page-header";
import { useActiveSite, useAscStore, useCurrentUser, useOwnSites, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/visitors")({
  component: () => (
    <PermissionGate perm="visitors">
      <VisitorsPage />
    </PermissionGate>
  ),
});

function VisitorsPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const ownSites = useOwnSites();
  const activeSite = useActiveSite();
  const setActiveSite = useAscStore((s) => s.setActiveSite);
  const ids = visibleClientIds(store, user);
  const sites = store.sites.filter((s) => ids.includes(s.clientId));
  const focusIds =
    user?.role === "client" && activeSite
      ? [activeSite.id]
      : sites.map((s) => s.id);
  const points = store.visitors.filter((v) => focusIds.includes(v.siteId));
  const views = points.reduce((a, v) => a + v.views, 0);
  const bots = points.reduce((a, v) => a + v.bots, 0);

  const perSite = sites.map((site) => {
    const rowsFor = store.visitors.filter((v) => v.siteId === site.id);
    return {
      site,
      client: store.clients.find((c) => c.id === site.clientId)?.name ?? "",
      views: rowsFor.reduce((a, v) => a + v.views, 0),
      bots: rowsFor.reduce((a, v) => a + v.bots, 0),
    };
  });

  const chart = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const p of points) {
      byDay.set(p.date, (byDay.get(p.date) ?? 0) + p.views);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, v]) => ({ d: d.slice(5), v }));
  }, [points]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Visitors"
        title="Visitors"
        description="Page views over the last 14 days, bots not counted."
      />
      {user?.role === "client" && ownSites.length > 1 ? (
        <NativeSelect
          className="max-w-xs"
          value={activeSite?.id ?? ""}
          onChange={(e) => setActiveSite(e.target.value)}
        >
          {ownSites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </NativeSelect>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Page views" value={String(views)} hint="Last 14 days" />
        <StatTile label="Bots excluded" value={String(bots)} hint="Not counted in views" />
        <StatTile
          label="Sites"
          value={String(user?.role === "client" && activeSite ? 1 : sites.length)}
          hint={activeSite ? activeSite.name : "In this account"}
        />
      </section>
      <Surface className="p-5">
        {views === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No visitors counted yet"
            detail="Numbers start to appear once your site is live and getting visits."
          />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-emerald)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-emerald)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card)", color: "var(--color-foreground)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="v" stroke="var(--color-emerald)" fill="url(#vis)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Surface>
      {user?.role === "operator" ? (
        <DataTable
          label="Visitors by site"
          rows={perSite}
          getRowId={(r) => r.site.id}
          searchText={(r) => `${r.site.name} ${r.client}`}
          searchPlaceholder="Search sites or clients"
          initialSort={{ id: "views", dir: "desc" }}
          empty={{ icon: BarChart3, title: "No sites yet", detail: "Visitor numbers appear once a site is live." }}
          columns={[
            {
              id: "site",
              header: "Site",
              sort: (a, b) => a.site.name.localeCompare(b.site.name),
              cell: (r) => <span className="font-medium">{r.site.name}</span>,
            },
            {
              id: "client",
              header: "Client",
              hideBelow: "sm",
              sort: (a, b) => a.client.localeCompare(b.client),
              cell: (r) => r.client,
            },
            { id: "views", header: "Page views", sort: (a, b) => a.views - b.views, cell: (r) => r.views.toLocaleString("en-ZA") },
            { id: "bots", header: "Bots excluded", hideBelow: "md", sort: (a, b) => a.bots - b.bots, cell: (r) => r.bots.toLocaleString("en-ZA") },
          ]}
        />
      ) : null}
    </div>
  );
}
