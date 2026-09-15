import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Surface } from "@/components/page-header";
import { StatusDot } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore, useCurrentUser, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/enquiries")({
  component: EnquiriesPage,
});

function EnquiriesPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const setEnquiryStatus = useAscStore((s) => s.setEnquiryStatus);
  const ids = visibleClientIds(store, user);
  const rows = store.enquiries
    .filter((e) => ids.includes(e.clientId))
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fresh = rows.filter((e) => e.status === "new").length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Enquiries"
        title="Enquiries"
        description="People who wrote from your website. Call them back from here."
      />
      <p className="text-sm text-muted-foreground">
        {fresh} new · {rows.length} in total
      </p>
      <Surface>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            No enquiries yet. They land here when someone uses the form on your
            site.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((e) => {
              const client = store.clients.find((c) => c.id === e.clientId);
              return (
                <li key={e.id} className="px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-champagne">{e.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {e.email} · {e.phone}
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
                    {user?.role === "operator" ? `${client?.name} · ` : ""}
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
