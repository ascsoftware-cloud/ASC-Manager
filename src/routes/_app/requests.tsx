import { useState, type FormEvent } from "react";
import { LifeBuoy } from "lucide-react";
import { DataTable } from "@/components/data-table";
import type { SupportRequest } from "@/lib/types";
import { PermissionGate } from "@/components/permission-gate";
import { createFileRoute } from "@tanstack/react-router";
import { Field, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore, useCurrentUser, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/requests")({
  component: () => (
    <PermissionGate perm="requests">
      <RequestsPage />
    </PermissionGate>
  ),
});

function RequestsPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const addRequest = useAscStore((s) => s.addRequest);
  const setRequestStatus = useAscStore((s) => s.setRequestStatus);
  const ids = visibleClientIds(store, user);
  const rows = store.requests.filter((r) => ids.includes(r.clientId));
  const isStaff = user?.role === "operator";
  const clientName = (id: string) => store.clients.find((c) => c.id === id)?.name ?? "";
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isStaff ? "Requests" : "Ask ASC"}
        description={
          isStaff
            ? "Work clients have asked us to do."
            : "Need something changed that you cannot edit yourself? Ask us here."
        }
        action={
          !isStaff ? <Button onClick={() => setOpen(true)}>New request</Button> : undefined
        }
      />
      <DataTable
        label="Requests"
        rows={rows}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.title} ${r.body} ${r.authorName} ${clientName(r.clientId)}`}
        searchPlaceholder="Search requests"
        filters={[
          {
            id: "status",
            label: "All statuses",
            options: [
              { value: "open", label: "Open" },
              { value: "done", label: "Done" },
            ],
            match: (r, v) => r.status === v,
          },
        ]}
        initialSort={{ id: "when", dir: "desc" }}
        empty={{
          icon: LifeBuoy,
          title: isStaff ? "No requests yet" : "You have not asked for anything yet",
          detail: isStaff ? "Requests from clients will appear here." : "Tell us what you would like changed.",
          action: !isStaff ? <Button onClick={() => setOpen(true)}>New request</Button> : undefined,
        }}
        columns={[
          {
            id: "title",
            header: "Request",
            sort: (a, b) => a.title.localeCompare(b.title),
            cell: (r) => (
              <>
                <p className="font-medium">{r.title}</p>
                {r.body ? (
                  <p className="type-small line-clamp-2 max-w-md text-muted-foreground">{r.body}</p>
                ) : null}
              </>
            ),
          },
          ...(isStaff
            ? [
                {
                  id: "client",
                  header: "Client",
                  hideBelow: "md" as const,
                  sort: (a: SupportRequest, b: SupportRequest) =>
                    clientName(a.clientId).localeCompare(clientName(b.clientId)),
                  cell: (r: SupportRequest) => (
                    <>
                      <p>{clientName(r.clientId)}</p>
                      <p className="type-small text-muted-foreground">{r.authorName}</p>
                    </>
                  ),
                },
              ]
            : []),
          {
            id: "when",
            header: "Sent",
            hideBelow: "sm",
            sort: (a, b) => a.createdAt.localeCompare(b.createdAt),
            cell: (r) => formatRelative(r.createdAt),
          },
          {
            id: "status",
            header: "Status",
            sort: (a, b) => a.status.localeCompare(b.status),
            cell: (r) => <StatusBadge status={r.status} />,
          },
          ...(isStaff
            ? [
                {
                  id: "actions",
                  header: "Actions",
                  align: "right" as const,
                  cell: (r: SupportRequest) =>
                    r.status === "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void saveAction("Marked as done", () => setRequestStatus(r.id, "done"));
                        }}
                      >
                        Mark done
                      </Button>
                    ) : null,
                },
              ]
            : []),
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <NewRequestForm
            onCancel={() => setOpen(false)}
            onSubmit={(title, body) => {
              const clientId = user?.clientId;
              if (!clientId || !user) return;
              void saveAction("Request sent", async () => {
                await addRequest({
                  clientId,
                  title,
                  body,
                  authorName: user.name,
                });
                setOpen(false);
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewRequestForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (title: string, body: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), body.trim());
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>New request</DialogTitle>
        <DialogDescription>We will pick this up. You can follow it here.</DialogDescription>
      </DialogHeader>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="What would you like us to do?">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Send</Button>
      </DialogFooter>
    </form>
  );
}
