import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Globe, Pencil, Plus } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDangerDialog } from "@/components/confirm-danger";
import { StaffGate } from "@/components/staff-gate";
import { Field, NativeSelect, PageHeader } from "@/components/page-header";
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
import { saveAction } from "@/lib/mutate";
import { useAscStore } from "@/lib/store";
import type { Site } from "@/lib/types";

export const Route = createFileRoute("/_app/sites")({
  component: () => (
    <StaffGate>
      <SitesPage />
    </StaffGate>
  ),
});

function SitesPage() {
  const sites = useAscStore((s) => s.sites);
  const clients = useAscStore((s) => s.clients);
  const siteRedesigns = useAscStore((s) => s.siteRedesigns);
  const addSite = useAscStore((s) => s.addSite);
  const removeSite = useAscStore((s) => s.removeSite);
  const saveSiteRedesign = useAscStore((s) => s.saveSiteRedesign);
  const clientOf = (s: Site) => clients.find((c) => c.id === s.clientId)?.name ?? "";
  const [open, setOpen] = useState(false);
  const [redesignFor, setRedesignFor] = useState<Site | null>(null);
  const [removeFor, setRemoveFor] = useState<Site | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sites"
        description="Public sites and admin systems we host or watch."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New site
          </Button>
        }
      />
      <DataTable
        label="Sites"
        rows={sites}
        getRowId={(s) => s.id}
        searchText={(s) =>
          `${s.name} ${s.host} ${clients.find((c) => c.id === s.clientId)?.name ?? ""}`
        }
        searchPlaceholder="Search sites or clients"
        filters={[
          {
            id: "kind",
            label: "All kinds",
            options: [
              { value: "public", label: "Public" },
              { value: "admin", label: "Admin" },
            ],
            match: (s, v) => s.kind === v,
          },
        ]}
        initialSort={{ id: "site", dir: "asc" }}
        empty={{
          icon: Globe,
          title: "No sites yet",
          detail: "Add a public site to a client so they can edit it from their desk.",
          action: (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              New site
            </Button>
          ),
        }}
        columns={[
          {
            id: "site",
            header: "Site",
            sort: (a, b) => a.name.localeCompare(b.name),
            cell: (s) => (
              <>
                <p className="font-medium">{s.name}</p>
                <p className="type-small text-muted-foreground">{s.host}</p>
              </>
            ),
          },
          {
            id: "client",
            header: "Client",
            hideBelow: "sm",
            sort: (a, b) => clientOf(a).localeCompare(clientOf(b)),
            cell: (s) => clientOf(s),
          },
          {
            id: "kind",
            header: "Kind",
            hideBelow: "md",
            cell: (s) => <Badge variant="muted">{s.kind === "public" ? "Public" : "Admin"}</Badge>,
          },
          {
            id: "live",
            header: "Live site",
            hideBelow: "lg",
            cell: (s) =>
              s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  View live
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-muted-foreground">None</span>
              ),
          },
          {
            id: "redesign",
            header: "Our redesign",
            hideBelow: "lg",
            cell: (s) => {
              const r = siteRedesigns.find((x) => x.siteId === s.id);
              return r?.redesignUrl ? (
                <a
                  href={r.redesignUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  View redesign
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-muted-foreground">Not added yet</span>
              );
            },
          },
          {
            id: "actions",
            header: "Actions",
            align: "right",
            cell: (s) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setRedesignFor(s)}>
                  <Pencil className="size-3.5" />
                  Redesign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRemoveFor(s)}
                >
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
      />
      <NewSiteDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(input) => {
          void saveAction("Site added", async () => {
            await addSite(input);
            setOpen(false);
          });
        }}
      />
      <RedesignDialog
        site={redesignFor}
        current={siteRedesigns.find((r) => r.siteId === redesignFor?.id) ?? null}
        onOpenChange={(v) => {
          if (!v) setRedesignFor(null);
        }}
        onSave={async (input) => {
          if (!redesignFor) return;
          const ok = await saveAction("Redesign link saved", () =>
            saveSiteRedesign(redesignFor.id, input),
          );
          if (ok) setRedesignFor(null);
        }}
      />
      <ConfirmDangerDialog
        open={Boolean(removeFor)}
        title={`Remove ${removeFor?.name ?? "this site"}?`}
        description="This takes the public site off this account and deletes its website content. The client stays. This cannot be undone."
        confirmLabel="Remove site"
        onOpenChange={(v) => {
          if (!v) setRemoveFor(null);
        }}
        onConfirm={async () => {
          if (!removeFor) return;
          const ok = await saveAction(`${removeFor.name} removed`, () =>
            removeSite(removeFor.id),
          );
          if (ok) setRemoveFor(null);
        }}
      />
    </div>
  );
}

function RedesignDialog({
  site,
  current,
  onOpenChange,
  onSave,
}: {
  site: Site | null;
  current: { redesignUrl: string; notes: string } | null;
  onOpenChange: (v: boolean) => void;
  onSave: (input: { redesignUrl: string; notes: string }) => Promise<void>;
}) {
  const [redesignUrl, setRedesignUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRedesignUrl(current?.redesignUrl ?? "");
    setNotes(current?.notes ?? "");
  }, [site?.id, current?.redesignUrl, current?.notes]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onSave({ redesignUrl: redesignUrl.trim(), notes: notes.trim() });
    setBusy(false);
  }

  return (
    <Dialog open={Boolean(site)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Redesign link — {site?.name}</DialogTitle>
            <DialogDescription>
              Where our build of this client's new site lives right now — a
              preview deploy, a staging URL, anything you can point them to.
              Staff only; this never appears on the client side.
            </DialogDescription>
          </DialogHeader>
          <Field label="Redesign URL">
            <Input
              value={redesignUrl}
              onChange={(e) => setRedesignUrl(e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. pushed to GitHub, not deployed yet"
              rows={3}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewSiteDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (input: Omit<Site, "id">) => void;
}) {
  const clients = useAscStore((s) => s.clients);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [kind, setKind] = useState<Site["kind"]>("public");

  function submit(e: FormEvent) {
    e.preventDefault();
    onCreate({
      clientId,
      name: name.trim(),
      host: name.trim(),
      url: url.trim(),
      kind,
    });
    setName("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New site</DialogTitle>
          </DialogHeader>
          <Field label="Client">
            <NativeSelect value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Name / host">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="URL">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} required />
          </Field>
          <Field label="Kind">
            <NativeSelect
              value={kind}
              onChange={(e) => setKind(e.target.value as Site["kind"])}
            >
              <option value="public">Public</option>
              <option value="admin">Admin</option>
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add site</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
