import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Field, NativeSelect, PageHeader, Surface } from "@/components/page-header";
import { StatusDot } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useDeskSite } from "@/lib/desk-site";
import { useAscStore, useCurrentUser, useOwnClient, useOwnSites, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/enquiries")({
  component: EnquiriesPage,
});

function EnquiriesPage() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const store = useAscStore();
  const ownSites = useOwnSites();
  const setEnquiryStatus = useAscStore((s) => s.setEnquiryStatus);
  const ids = visibleClientIds(store, user);
  const [picked, setPicked] = useState(own?.id ?? "");
  const clientId = own?.id ?? picked;
  const { clientSites } = useDeskSite(clientId || ids[0] || null);
  const sitesForFilter =
    user?.role === "client" ? ownSites : clientId ? clientSites : store.sites;
  const [siteFilter, setSiteFilter] = useState("");
  const rows = store.enquiries
    .filter((e) => ids.includes(e.clientId))
    .filter((e) => (clientId ? e.clientId === clientId : true))
    .filter((e) => (siteFilter ? e.siteId === siteFilter : true))
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fresh = rows.filter((e) => e.status === "new").length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Enquiries"
        title="Enquiries"
        description="People who wrote from a public site. Each note says which website it came from."
      />
      {user?.role === "operator" ? (
        <Field label="Client">
          <NativeSelect
            className="max-w-xs"
            value={clientId}
            onChange={(e) => {
              setPicked(e.target.value);
              setSiteFilter("");
            }}
          >
            <option value="">All clients</option>
            {store.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      {sitesForFilter.length > 1 ? (
        <Field label="Site">
          <NativeSelect
            className="max-w-xs"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
          >
            <option value="">All sites</option>
            {sitesForFilter.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {fresh} new · {rows.length} in total
      </p>
      <Surface>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            No enquiries yet. They land here when someone uses the form on one of
            your sites.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((e) => {
              const client = store.clients.find((c) => c.id === e.clientId);
              const fromSite = store.sites.find((s) => s.id === e.siteId);
              return (
                <li key={e.id} className="px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-champagne">{e.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {e.email} · {e.phone}
                      </p>
                      <p className="mt-1 text-xs font-medium text-emerald">
                        From {fromSite?.name ?? "an unknown site"}
                        {user?.role === "operator" && client ? ` · ${client.name}` : ""}
                      </p>
                    </div>
                    <StatusDot
                      status={
                        e.status === "new" ? "open" : e.status === "done" ? "done" : "read"
                      }
                    />
                  </div>
                  <p className="mt-3 max-w-2xl text-sm text-foreground">{e.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatRelative(e.createdAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {e.phone ? (
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <a href={`tel:${e.phone.replace(/\s/g, "")}`}>Call</a>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <a href={`mailto:${e.email}`}>Email</a>
                    </Button>
                    {e.status === "new" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          void saveAction("Marked read", () =>
                            setEnquiryStatus(e.id, "read"),
                          );
                        }}
                      >
                        Mark read
                      </Button>
                    ) : null}
                    {e.status !== "done" ? (
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          void saveAction("Done", () => setEnquiryStatus(e.id, "done"));
                        }}
                      >
                        Done
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>
    </div>
  );
}
