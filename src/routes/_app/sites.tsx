import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { StaffGate } from "@/components/staff-gate";
import { Field, NativeSelect, PageHeader, Surface } from "@/components/page-header";
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
  const saveSiteRedesign = useAscStore((s) => s.saveSiteRedesign);
  const [open, setOpen] = useState(false);
  const [redesignFor, setRedesignFor] = useState<Site | null>(null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Sites"
        title="Sites"
        description="Public sites and admin systems we host or watch. Live site and redesign links are staff-only — clients never see this page."
        action={
          <Button className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New site
          </Button>
        }
      />
      <Surface>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3 font-medium">System</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Kind</th>
              <th className="px-5 py-3 font-medium">Live site</th>
              <th className="px-5 py-3 font-medium">Our redesign</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => {
              const client = clients.find((c) => c.id === s.clientId);
              const redesign = siteRedesigns.find((r) => r.siteId === s.id);
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-champagne">{s.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{client?.name}</td>
                  <td className="px-5 py-4 capitalize text-muted-foreground">{s.kind}</td>
                  <td className="px-5 py-4">
                    {s.url ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          View live
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {redesign?.redesignUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={redesign.redesignUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View redesign
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">Not added yet</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRedesignFor(s)}
                    >
                      <Pencil className="size-3.5" />
                      {redesign?.redesignUrl ? "Edit" : "Add redesign"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Surface>
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
