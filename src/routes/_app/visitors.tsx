import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Kpi, PageHeader, Surface } from "@/components/page-header";
import { useAscStore, useCurrentUser, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/visitors")({
  component: VisitorsPage,
});

function VisitorsPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const ids = visibleClientIds(store, user);
  const sites = store.sites.filter((s) => ids.includes(s.clientId));
  const siteIds = sites.map((s) => s.id);
  const points = store.visitors.filter((v) => siteIds.includes(v.siteId));
  const views = points.reduce((a, v) => a + v.views, 0);
  const bots = points.reduce((a, v) => a + v.bots, 0);

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
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Visitors"
        title="Visitors"
        description="Page views on the public sites, bots excluded."
      />
      <section className="grid gap-0 sm:grid-cols-3">
        <Kpi label="Page views" value={String(views)} hint="Last 14 days" accent />
        <Kpi label="Bots excluded" value={String(bots)} hint="Not counted in views" />
        <Kpi label="Sites" value={String(sites.length)} hint="In this account" />
      </section>
      <Surface className="p-5">
        {views === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            No page views recorded yet. Counters start once the public site is live
            with analytics.
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ecf8e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3ecf8e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fill: "#9aada4", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0c1b16", border: "1px solid rgba(239,230,212,0.1)" }}
                />
                <Area type="monotone" dataKey="v" stroke="#3ecf8e" fill="url(#vis)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Surface>
    </div>
  );
}
