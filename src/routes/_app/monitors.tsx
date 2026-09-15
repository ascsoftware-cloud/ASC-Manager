import { createFileRoute } from "@tanstack/react-router";
import { StaffGate } from "@/components/staff-gate";
import { PageHeader, Surface } from "@/components/page-header";
import { StatusDot } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { useAscStore } from "@/lib/store";

export const Route = createFileRoute("/_app/monitors")({
  component: () => (
    <StaffGate>
      <MonitorsPage />
    </StaffGate>
  ),
});

function MonitorsPage() {
  const store = useAscStore();
  const runChecks = useAscStore((s) => s.runChecks);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Monitors"
        title="Monitors"
        description="HTTP and TLS checks on every system. Run a check when you need a fresh reading."
      />
      <Surface>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Check</th>
              <th className="px-5 py-3 font-medium">System</th>
              <th className="px-5 py-3 font-medium">Last checked</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {store.monitors.map((m) => {
              const site = store.sites.find((s) => s.id === m.siteId);
              const client = store.clients.find((c) => c.id === site?.clientId);
              return (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4">
                    <StatusDot status={m.status} />
                  </td>
                  <td className="px-5 py-4 text-champagne">{m.label}</td>
                  <td className="px-5 py-4">
                    <p className="text-champagne">{site?.name}</p>
                    <p className="text-xs text-muted-foreground">{client?.name}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {m.lastCheckedAt ? formatRelative(m.lastCheckedAt) : "never"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        if (site) void runChecks(site.id);
                      }}
                    >
                      Run
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}
