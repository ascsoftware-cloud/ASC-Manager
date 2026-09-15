import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Field, PageHeader, Surface } from "@/components/page-header";
import { StatusDot } from "@/components/status-badge";
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
  component: RequestsPage,
});

function RequestsPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const addRequest = useAscStore((s) => s.addRequest);
  const setRequestStatus = useAscStore((s) => s.setRequestStatus);
  const ids = visibleClientIds(store, user);
  const rows = store.requests.filter((r) => ids.includes(r.clientId));
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Requests"
        title="Requests"
        description={
          user?.role === "operator"
            ? "Work clients asked ASC to do."
            : "Ask us to change something you cannot edit yourself."
        }
        action={
          user?.role === "client" ? (
            <Button className="rounded-full" onClick={() => setOpen(true)}>
              Open a new one
            </Button>
          ) : undefined
        }
      />
      <Surface>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const client = store.clients.find((c) => c.id === r.clientId);
              return (
                <li key={r.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-champagne">{r.title}</p>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground">{r.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {client?.name} · {r.authorName} · {formatRelative(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusDot status={r.status} />
                    {user?.role === "operator" && r.status === "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          void saveAction("Marked done", () =>
                            setRequestStatus(r.id, "done"),
                          );
                        }}
                      >
                        Mark done
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <NewRequestForm
            onCancel={() => setOpen(false)}
            onSubmit={(title, body) => {
              const clientId = user?.clientId;
              if (!clientId || !user) return;
              void saveAction("Request sent to ASC", async () => {
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
        <DialogDescription>ASC will pick this up. You keep a copy here.</DialogDescription>
      </DialogHeader>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="What should we do">
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
