import { createFileRoute } from "@tanstack/react-router";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { CalendarClock } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, TypeLabel } from "@/components/status-badge";
import { formatDay } from "@/lib/format";
import { useAscStore, useCurrentUser, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/renewals")({
  component: RenewalsPage,
});

function RenewalsPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const isStaff = user?.role === "operator";
  const ids = visibleClientIds(store, user);
  const rows = store.renewals
    .filter((r) => ids.includes(r.clientId))
    .map((r) => ({
      ...r,
      client: store.clients.find((c) => c.id === r.clientId)?.name ?? "",
      days: differenceInCalendarDays(parseISO(r.expiresAt), new Date()),
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Renewals"
        description={
          isStaff
            ? "Domains, hosting and certificates across every client."
            : "What we renew for you, and when it is due."
        }
      />
      <DataTable
        label="Renewals"
        rows={rows}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.item} ${r.client} ${r.type}`}
        searchPlaceholder="Search renewals"
        filters={[
          {
            id: "type",
            label: "All types",
            options: [
              { value: "domain", label: "Domain" },
              { value: "hosting", label: "Hosting" },
              { value: "ssl", label: "Certificate" },
            ],
            match: (r, v) => r.type === v,
          },
          {
            id: "when",
            label: "Any time",
            options: [
              { value: "30", label: "Due in 30 days" },
              { value: "90", label: "Due in 90 days" },
            ],
            match: (r, v) => r.days <= Number(v),
          },
        ]}
        initialSort={{ id: "expires", dir: "asc" }}
        empty={{
          icon: CalendarClock,
          title: "No renewals yet",
          detail: isStaff
            ? "Domains, hosting and certificates will be listed here."
            : "When we renew something for you, it will be listed here.",
        }}
        columns={[
          ...(isStaff
            ? [
                {
                  id: "client",
                  header: "Client",
                  sort: (a: (typeof rows)[number], b: (typeof rows)[number]) =>
                    a.client.localeCompare(b.client),
                  cell: (r: (typeof rows)[number]) => r.client,
                },
              ]
            : []),
          {
            id: "item",
            header: "Item",
            sort: (a, b) => a.item.localeCompare(b.item),
            cell: (r) => <span className="font-medium">{r.item}</span>,
          },
          {
            id: "type",
            header: "Type",
            hideBelow: "sm",
            cell: (r) => <TypeLabel>{r.type === "ssl" ? "certificate" : r.type}</TypeLabel>,
          },
          {
            id: "expires",
            header: "Expires",
            sort: (a, b) => a.expiresAt.localeCompare(b.expiresAt),
            cell: (r) => formatDay(r.expiresAt),
          },
          {
            id: "left",
            header: "Time left",
            cell: (r) => (
              <StatusBadge
                tone={r.days < 0 ? "bad" : r.days <= 30 ? "warn" : "neutral"}
                label={r.days < 0 ? "Overdue" : r.days === 0 ? "Today" : `${r.days} days`}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
