import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { StaffGate } from "@/components/staff-gate";
import { Field, NativeSelect, PageHeader, Surface } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const addSite = useAscStore((s) => s.addSite);
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Sites"
        title="Sites"
        description="Public sites and admin systems we host or watch."
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
              <th className="px-5 py-3 font-medium">URL</th>
              <th className="px-5 py-3 font-medium">Kind</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => {
              const client = clients.find((c) => c.id === s.clientId);
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-champagne">{s.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{client?.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{s.url}</td>
                  <td className="px-5 py-4 capitalize text-muted-foreground">{s.kind}</td>
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
    </div>
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
