import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyDesk, GripHandle, LivePill } from "@/components/desk-ui";
import { MediaPicker } from "@/components/media-picker";
import { Field, NativeSelect, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatZar, plainText, reorderIds } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore, useCurrentUser, useOwnClient, visibleClientIds } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/store")({
  component: StorePage,
});

type Filter = "all" | "live" | "hidden" | "out";

function StorePage() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const clients = useAscStore((s) => s.clients);
  const products = useAscStore((s) => s.products);
  const addProduct = useAscStore((s) => s.addProduct);
  const updateProduct = useAscStore((s) => s.updateProduct);
  const removeProduct = useAscStore((s) => s.removeProduct);
  const reorderProducts = useAscStore((s) => s.reorderProducts);
  const ids = visibleClientIds(useAscStore.getState(), user);
  const [picked, setPicked] = useState(own?.id ?? ids[0] ?? "");
  const clientId = own?.id ?? picked;
  const allowed = user?.role === "operator" || own?.modules.store;
  const selected = clients.find((c) => c.id === clientId);
  const advertOn = Boolean(selected?.modules.advert);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return products
      .filter((p) => p.clientId === clientId)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .filter((p) => {
        if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
        if (filter === "live") return p.live;
        if (filter === "hidden") return !p.live;
        if (filter === "out") return p.live && p.stock === 0;
        return true;
      });
  }, [products, clientId, q, filter]);

  if (!allowed) {
    return (
      <EmptyDesk
        title="Store is off"
        detail="This site does not sell anything. Ask ASC if you need a shop."
      />
    );
  }

  async function dropOn(targetId: string) {
    if (!dragId || !clientId || dragId === targetId) return;
    const all = products
      .filter((p) => p.clientId === clientId)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.id);
    const next = reorderIds(all, dragId, targetId);
    setDragId(null);
    await saveAction("Order saved", () => reorderProducts(clientId, next));
  }

  function move(id: string, dir: -1 | 1) {
    if (!clientId) return;
    const all = products
      .filter((p) => p.clientId === clientId)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.id);
    const i = all.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return;
    const next = reorderIds(all, id, all[j]);
    void saveAction("Order saved", () => reorderProducts(clientId, next));
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="Store"
        title="Store"
        description="The shop floor. Drag to set the public order. Live means it shows."
        action={
          <Button
            className="rounded-full"
            onClick={() => {
              if (!clientId) return;
              void saveAction("Item added", async () => {
                await addProduct({
                  clientId,
                  name: "New item",
                  priceZar: 0,
                  stock: 0,
                  live: false,
                  photoPath: "",
                  note: "",
                  featured: false,
                });
              });
            }}
          >
            Add item
          </Button>
        }
      />
      {user?.role === "operator" ? (
        <NativeSelect
          className="max-w-xs"
          value={clientId}
          onChange={(e) => setPicked(e.target.value)}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1">
          {(["all", "live", "hidden", "out"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "min-h-11 px-3 font-mono text-[11px] uppercase tracking-[0.14em]",
                filter === f ? "text-champagne" : "text-muted-foreground hover:text-champagne",
              )}
            >
              {f === "out" ? "Out of stock" : f}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyDesk
          title="Nothing in the shop yet."
          detail="Add an item, then set a price and flip it live."
          action={
            <Button
              className="rounded-full"
              onClick={() => {
                if (!clientId) return;
                void saveAction("Item added", () =>
                  addProduct({
                    clientId,
                    name: "New item",
                    priceZar: 0,
                    stock: 0,
                    live: false,
                    photoPath: "",
                    note: "",
                    featured: false,
                  }),
                );
              }}
            >
              Add item
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <li
              key={p.id}
              draggable
              onDragStart={() => setDragId(p.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void dropOn(p.id)}
              className={cn(
                "flex gap-1 border border-border bg-card",
                p.live && p.stock === 0 && "opacity-60",
              )}
            >
              <GripHandle />
              <button
                type="button"
                className="min-h-11 flex-1 p-3 text-left"
                onClick={() => setOpenId(p.id)}
              >
                <div className="mb-3 aspect-[4/3] overflow-hidden bg-muted">
                  {p.photo ? (
                    <img src={p.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      No photo
                    </div>
                  )}
                </div>
                <p className="font-display text-xl text-champagne">{p.name}</p>
                <p className="mt-1 text-sm text-champagne">{formatZar(p.priceZar)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <LivePill live={p.live} stock={p.stock} />
                  {p.featured ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                      This week
                    </span>
                  ) : null}
                </div>
              </button>
              <div className="flex flex-col sm:hidden">
                <Button size="icon-sm" variant="ghost" onClick={() => move(p.id, -1)} aria-label="Move up">
                  ↑
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => move(p.id, 1)} aria-label="Move down">
                  ↓
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={Boolean(openId)}
        onOpenChange={(v) => {
          if (!v) setOpenId(null);
        }}
      >
        <SheetContent side="right" className="w-[min(28rem,92vw)] overflow-y-auto bg-card p-0">
          {openId ? (
            <ProductDrawer
              key={openId}
              product={products.find((p) => p.id === openId)!}
              clientId={clientId}
              advertOn={advertOn}
              onSave={(id, patch) => saveAction("Saved", () => updateProduct(id, patch))}
              onDelete={(id) =>
                saveAction("Removed", async () => {
                  await removeProduct(id);
                  setOpenId(null);
                })
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProductDrawer({
  product,
  clientId,
  advertOn,
  onSave,
  onDelete,
}: {
  product: Product;
  clientId: string;
  advertOn: boolean;
  onSave: (id: string, patch: Partial<Product>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(product.name);
  const [note, setNote] = useState(product.note);
  const [price, setPrice] = useState(String(product.priceZar));
  const [stock, setStock] = useState(String(product.stock));
  const [live, setLive] = useState(product.live);
  const [featured, setFeatured] = useState(product.featured);
  const [photoPath, setPhotoPath] = useState(product.photoPath);
  const [confirm, setConfirm] = useState(false);
  const [nameErr, setNameErr] = useState("");

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-2xl text-champagne">{name || "Item"}</SheetTitle>
        <SheetDescription className="sr-only">Edit this shop item</SheetDescription>
      </SheetHeader>
      <form
        className="flex flex-col gap-6 px-5 pb-8"
        onSubmit={(e) => {
          e.preventDefault();
          const n = plainText(name);
          if (!n) {
            setNameErr("Give it a name.");
            return;
          }
          setNameErr("");
          void onSave(product.id, {
            name: n,
            note: plainText(note),
            priceZar: Math.max(0, Number(price) || 0),
            stock: Math.max(0, Math.floor(Number(stock) || 0)),
            live,
            featured,
            photoPath,
          });
        }}
      >
        <MediaPicker clientId={clientId} valuePath={photoPath} onPick={setPhotoPath} />
        <Field label="Name" hint={nameErr}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          {nameErr ? <p className="text-sm text-destructive">{nameErr}</p> : null}
        </Field>
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (R)">
            <Input
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Stock">
            <Input
              type="number"
              min={0}
              step={1}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Live
          </span>
          <Switch checked={live} onCheckedChange={setLive} />
        </label>
        {advertOn ? (
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Use on this week’s advert
            </span>
            <Switch checked={featured} onCheckedChange={setFeatured} />
          </label>
        ) : null}
        <Button type="submit" className="rounded-full">
          Save
        </Button>
        {confirm ? (
          <div className="flex gap-2">
            <Button type="button" variant="destructive" className="rounded-full" onClick={() => void onDelete(product.id)}>
              Delete it
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirm(true)}>
            Delete
          </Button>
        )}
      </form>
    </>
  );
}
