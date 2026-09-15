import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { formatRelative } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore, useCurrentUser, visibleClientIds } from "@/lib/store";
import type { BlockKind, ContentBlock } from "@/lib/types";

export const Route = createFileRoute("/_app/content")({
  component: ContentPage,
});

function ContentPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const ids = visibleClientIds(store, user);
  const sites = store.sites.filter((s) => ids.includes(s.clientId));
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [addOpen, setAddOpen] = useState(false);
  const site = sites.find((s) => s.id === siteId) ?? sites[0];
  const client = store.clients.find((c) => c.id === site?.clientId);
  const blocks = store.blocks.filter((b) => b.siteId === site?.id);
  const groups = useMemo(() => {
    const map = new Map<string, ContentBlock[]>();
    for (const b of blocks) {
      const list = map.get(b.group) ?? [];
      list.push(b);
      map.set(b.group, list);
    }
    return [...map.entries()];
  }, [blocks]);

  if (!site) {
    return (
      <PageHeader
        title="No site yet"
        description="ASC will add your site here when it is live."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Website content"
        title={`Content: ${site.host}`}
        description={`${client?.name} — ${blocks.length} blocks`}
        action={
          <Button className="rounded-full" onClick={() => setAddOpen(true)}>
            Add block
          </Button>
        }
      />

      <label className="max-w-md">
          <NativeSelect
            value={site.id}
            onChange={(e) => setSiteId(e.target.value)}
            aria-label="Site"
          >
            {sites.map((s) => {
              const c = store.clients.find((x) => x.id === s.clientId);
              return (
                <option key={s.id} value={s.id}>
                  {c?.name} — {s.host}
                </option>
              );
            })}
          </NativeSelect>
        </label>

      <div className="flex flex-col gap-6">
        {groups.map(([group, items]) => (
          <Surface key={group}>
            <div className="border-b border-border px-5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {group}
              </p>
            </div>
            <ul className="divide-y divide-border">
              {items.map((b) => (
                <li key={b.id} className="px-5 py-5">
                  <BlockEditor key={b.id} block={b} actor={user?.name ?? "Someone"} />
                </li>
              ))}
            </ul>
          </Surface>
        ))}
      </div>

      <AddBlockDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        siteId={site.id}
        actor={user?.name ?? "Someone"}
      />
    </div>
  );
}

function BlockEditor({ block, actor }: { block: ContentBlock; actor: string }) {
  const updateBlock = useAscStore((s) => s.updateBlock);
  const uploadBlockImage = useAscStore((s) => s.uploadBlockImage);
  const [value, setValue] = useState(block.value);
  const remaining = block.maxLen ? block.maxLen - value.length : null;

  function save(next: string) {
    setValue(next);
    void saveAction("Saved in Manager — not live until the public site is wired.", () =>
      updateBlock(block.id, next, actor),
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {block.label}
        </p>
        <span className="text-xs text-emerald">settings</span>
      </div>

      {block.kind === "image" ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-24 w-full items-center justify-center border border-dashed border-border text-sm text-muted-foreground sm:w-64">
            {value ? (
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : (
              "No image yet"
            )}
          </div>
          <div>
            <label className="inline-flex h-10 cursor-pointer items-center rounded-full border border-border px-4 text-sm">
              Choose File
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  void saveAction(
                    "Saved in Manager — not live until the public site is wired.",
                    async () => {
                      await uploadBlockImage(block.id, file, actor);
                      const latest = useAscStore
                        .getState()
                        .blocks.find((b) => b.id === block.id);
                      if (latest) setValue(latest.value);
                    },
                  );
                }}
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              {value ? "Image on file" : "No file chosen"}
            </p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">{block.hint}</p>
          </div>
        </div>
      ) : block.kind === "url" ? (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value !== block.value) save(value);
          }}
          className="mt-2 w-full border-0 bg-transparent text-sm text-champagne focus-visible:outline-none"
        />
      ) : (
        <textarea
          value={value}
          maxLength={block.maxLen || undefined}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (value !== block.value) save(value);
          }}
          rows={2}
          className="mt-2 w-full resize-none border-0 bg-transparent text-sm text-champagne focus-visible:outline-none"
        />
      )}

      {block.kind !== "image" && block.hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{block.hint}</p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        Last changed {formatRelative(block.updatedAt)}. Key: {block.key}
      </p>
      {remaining != null ? (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {remaining} characters left
        </p>
      ) : null}
    </div>
  );
}

function AddBlockDialog({
  open,
  onOpenChange,
  siteId,
  actor,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  siteId: string;
  actor: string;
}) {
  const addBlock = useAscStore((s) => s.addBlock);
  const [label, setLabel] = useState("");
  const [group, setGroup] = useState("Home");
  const [kind, setKind] = useState<BlockKind>("text");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    const key = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 32);
    const ok = await saveAction("Block added in Manager", () =>
      addBlock(
        {
          siteId,
          group: group.trim() || "Home",
          key,
          label: label.trim(),
          kind,
          value: "",
          hint: "",
          maxLen: kind === "text" ? 160 : kind === "url" ? 240 : 0,
        },
        actor,
      ),
    );
    if (!ok) return;
    setLabel("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add block</DialogTitle>
            <DialogDescription>
              A field the client can change on their public site.
            </DialogDescription>
          </DialogHeader>
          <Field label="Label">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
          </Field>
          <Field label="Group">
            <Input value={group} onChange={(e) => setGroup(e.target.value)} />
          </Field>
          <Field label="Type">
            <NativeSelect
              value={kind}
              onChange={(e) => setKind(e.target.value as BlockKind)}
            >
              <option value="text">Text</option>
              <option value="url">Link</option>
              <option value="image">Image</option>
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
