import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  GripVertical,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { MediaPicker } from "@/components/media-picker";
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
type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; id: string };

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
  const [view, setView] = useState<View>({ mode: "list" });
  const [dragId, setDragId] = useState<string | null>(null);

  const catalog = useMemo(
    () =>
      products
        .filter((p) => p.clientId === clientId)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [products, clientId],
  );

  const counts = useMemo(
    () => ({
      all: catalog.length,
      live: catalog.filter((p) => p.live).length,
      hidden: catalog.filter((p) => !p.live).length,
      out: catalog.filter((p) => p.live && p.stock === 0).length,
    }),
    [catalog],
  );

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return catalog.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query) && !p.note.toLowerCase().includes(query)) {
        return false;
      }
      if (filter === "live") return p.live;
      if (filter === "hidden") return !p.live;
      if (filter === "out") return p.live && p.stock === 0;
      return true;
    });
  }, [catalog, q, filter]);

  async function dropOn(targetId: string) {
    if (!dragId || !clientId || dragId === targetId) return;
    const all = catalog.map((p) => p.id);
    const next = reorderIds(all, dragId, targetId);
    setDragId(null);
    await saveAction("Order saved", () => reorderProducts(clientId, next));
  }

  function move(id: string, dir: -1 | 1) {
    if (!clientId) return;
    const all = catalog.map((p) => p.id);
    const i = all.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return;
    const next = reorderIds(all, id, all[j]);
    void saveAction("Order saved", () => reorderProducts(clientId, next));
  }

  if (!allowed) {
    return (
      <ShopShell>
        <EmptyShop
          title="Store is off"
          detail="This site does not sell anything. Ask ASC if you need a shop."
        />
      </ShopShell>
    );
  }

  const editing = view.mode === "edit" ? products.find((p) => p.id === view.id) : undefined;
  const showEditor = view.mode === "create" || Boolean(editing);

  if (showEditor) {
    return (
      <ShopShell>
        <ProductEditor
          key={editing?.id ?? "new"}
          product={editing}
          clientId={clientId}
          advertOn={advertOn}
          onCancel={() => setView({ mode: "list" })}
          onSave={async (patch) => {
            if (editing) {
              const ok = await saveAction("Product saved", () => updateProduct(editing.id, patch));
              if (ok) setView({ mode: "list" });
              return ok;
            }
            const ok = await saveAction("Product added", () =>
              addProduct({
                clientId,
                name: patch.name ?? "",
                priceZar: patch.priceZar ?? 0,
                stock: patch.stock ?? 0,
                live: patch.live ?? false,
                photoPath: patch.photoPath ?? "",
                note: patch.note ?? "",
                featured: patch.featured ?? false,
              }),
            );
            if (ok) setView({ mode: "list" });
            return ok;
          }}
          onDelete={
            editing
              ? async () => {
                  const ok = await saveAction("Product removed", () => removeProduct(editing.id));
                  if (ok) setView({ mode: "list" });
                  return ok;
                }
              : undefined
          }
        />
      </ShopShell>
    );
  }

  return (
    <ShopShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add items, set a price, and mark them Active when they should show on the site.
          </p>
        </div>
        <Button
          className="min-h-11 shrink-0"
          disabled={!clientId}
          onClick={() => setView({ mode: "create" })}
        >
          <Plus className="size-4" />
          Add product
        </Button>
      </div>

      {user?.role === "operator" ? (
        <label className="flex max-w-xs flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Client</span>
          <select
            className="flex h-11 w-full rounded-lg bg-card px-3 text-sm text-foreground"
            value={clientId}
            onChange={(e) => setPicked(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {catalog.length === 0 && !q ? (
        <EmptyShop
          title="Add your first product"
          detail="Give it a name, a photo, and a price. Keep it as Draft until you are ready, then set it to Active."
          action={
            <Button disabled={!clientId} onClick={() => setView({ mode: "create" })}>
              <Plus className="size-4" />
              Add product
            </Button>
          }
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-lift)]">
          <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products"
                className="h-11 pl-9"
                aria-label="Search products"
              />
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-b border-border px-2">
            {(
              [
                ["all", "All", counts.all],
                ["live", "Active", counts.live],
                ["hidden", "Draft", counts.hidden],
                ["out", "Out of stock", counts.out],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-current={filter === key ? "page" : undefined}
                className={cn(
                  "relative min-h-11 shrink-0 px-3 text-sm font-medium",
                  filter === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className="ml-1.5 tabular-nums text-muted-foreground">{n}</span>
                {filter === key ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground" />
                ) : null}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              No products match that search.
            </p>
          ) : (
            <ul>
              <li className="hidden border-b border-border bg-muted/60 text-[13px] font-medium text-muted-foreground sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_7.5rem_8.5rem_6.5rem]">
                <span className="px-2 py-2.5" />
                <span className="px-3 py-2.5">Product</span>
                <span className="px-3 py-2.5">Status</span>
                <span className="px-3 py-2.5">Inventory</span>
                <span className="px-3 py-2.5 text-right">Price</span>
              </li>
              {rows.map((p) => (
                <li
                  key={p.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void dropOn(p.id)}
                  className={cn(
                    "cursor-pointer border-b border-border last:border-0 hover:bg-muted/70",
                    dragId === p.id && "bg-accent",
                  )}
                >
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch sm:grid-cols-[2rem_minmax(0,1fr)_7.5rem_8.5rem_6.5rem]"
                    onClick={() => setView({ mode: "edit", id: p.id })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setView({ mode: "edit", id: p.id });
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit ${p.name}`}
                  >
                    <span
                      draggable
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => setDragId(null)}
                      className="hidden cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing sm:flex"
                      aria-label={`Reorder ${p.name}`}
                    >
                      <GripVertical className="size-4" />
                    </span>
                    <div className="flex min-h-14 min-w-0 items-center gap-3 px-3 py-2.5 text-left">
                      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {p.photo ? (
                          <img src={p.photo} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <Package className="size-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {p.name}
                        </span>
                        {p.featured ? (
                          <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                            On the site
                          </span>
                        ) : null}
                        <span className="mt-0.5 flex flex-wrap items-center gap-2 sm:hidden">
                          <StatusPill live={p.live} stock={p.stock} />
                          <span className="text-sm text-muted-foreground">{formatZar(p.priceZar)}</span>
                        </span>
                      </span>
                    </div>
                    <div className="hidden items-center px-3 sm:flex">
                      <StatusPill live={p.live} stock={p.stock} />
                    </div>
                    <p className="hidden items-center px-3 text-sm text-foreground sm:flex">
                      {p.stock} in stock
                    </p>
                    <p className="hidden items-center justify-end px-3 text-sm tabular-nums text-foreground sm:flex">
                      {formatZar(p.priceZar)}
                    </p>
                    <div
                      className="flex flex-col justify-center pr-1 sm:hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => move(p.id, -1)}
                        aria-label={`Move ${p.name} up`}
                      >
                        ↑
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => move(p.id, 1)}
                        aria-label={`Move ${p.name} down`}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </ShopShell>
  );
}

function ProductEditor({
  product,
  clientId,
  advertOn,
  onSave,
  onCancel,
  onDelete,
}: {
  product?: Product;
  clientId: string;
  advertOn: boolean;
  onSave: (patch: Partial<Product>) => Promise<boolean>;
  onCancel: () => void;
  onDelete?: () => Promise<boolean>;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [note, setNote] = useState(product?.note ?? "");
  const [price, setPrice] = useState(product ? String(product.priceZar) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [live, setLive] = useState(product?.live ?? false);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [photoPath, setPhotoPath] = useState(product?.photoPath ?? "");
  const [nameErr, setNameErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const creating = !product;

  const dirty =
    name !== (product?.name ?? "") ||
    note !== (product?.note ?? "") ||
    price !== (product ? String(product.priceZar) : "") ||
    stock !== (product ? String(product.stock) : "0") ||
    live !== (product?.live ?? false) ||
    featured !== (product?.featured ?? false) ||
    photoPath !== (product?.photoPath ?? "");

  function leave() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onCancel();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = plainText(name);
    if (!n) {
      setNameErr("Enter a product title.");
      return;
    }
    setNameErr("");
    setSaving(true);
    try {
      await onSave({
        name: n,
        note: plainText(note),
        priceZar: Math.max(0, Number(price) || 0),
        stock: Math.max(0, Math.floor(Number(stock) || 0)),
        live,
        featured,
        photoPath,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-5 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={leave} aria-label="Back to products">
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="truncate text-[1.375rem] font-semibold tracking-tight text-foreground">
            {creating ? "Add product" : name || "Product"}
          </h1>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Button type="button" variant="outline" onClick={leave}>
            Discard
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col gap-4">
          <ShopCard>
            <ShopField label="Title" error={nameErr}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Short sleeve t-shirt"
                className="h-11 text-base"
                autoFocus={creating}
              />
            </ShopField>
            <ShopField label="Description">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="What is this, and who is it for?"
              />
            </ShopField>
          </ShopCard>

          <ShopCard title="Media">
            <MediaPicker
              clientId={clientId}
              valuePath={photoPath}
              onPick={setPhotoPath}
              variant="dropzone"
            />
          </ShopCard>

          <ShopCard title="Pricing">
            <ShopField label="Price">
              <div className="relative max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R
                </span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-8"
                  placeholder="0"
                />
              </div>
            </ShopField>
          </ShopCard>

          <ShopCard title="Inventory">
            <ShopField label="Quantity" hint="Active products with 0 left show as out of stock.">
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="max-w-xs"
              />
            </ShopField>
          </ShopCard>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <ShopCard title="Status">
            <ShopField label="Product status">
              <select
                className="flex h-11 w-full rounded-lg bg-card px-3 text-sm text-foreground"
                value={live ? "active" : "draft"}
                onChange={(e) => setLive(e.target.value === "active")}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </ShopField>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {live
                ? "This product shows on the public site."
                : "Hidden until you set it to Active."}
            </p>
          </ShopCard>
          {advertOn ? (
            <ShopCard title="On the website">
              <label className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-sm text-foreground">Can be attached to a site picture</span>
                <Switch checked={featured} onCheckedChange={setFeatured} />
              </label>
            </ShopCard>
          ) : null}
          {onDelete ? (
            <ShopCard>
              <p className="text-sm text-muted-foreground">Remove this product from the shop.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                Delete product
              </Button>
            </ShopCard>
          ) : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm sm:hidden">
        <div className="mx-auto flex max-w-[62.5rem] gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={leave}>
            Discard
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {name || "this product"}?</DialogTitle>
            <DialogDescription>
              It will disappear from the shop. You cannot undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                if (onDelete) void onDelete();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[62.5rem] flex-col gap-5 text-[15px] leading-6">
      {children}
    </div>
  );
}

function ShopCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-lift)] sm:p-5">
      {title ? <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2> : null}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function ShopField({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
      {hint && !error ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function StatusPill({ live, stock }: { live: boolean; stock: number }) {
  if (live && stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/20 px-2 py-0.5 text-xs font-medium text-warn">
        <span className="size-1.5 rounded-full bg-warn" />
        Out of stock
      </span>
    );
  }
  if (live) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/20 px-2 py-0.5 text-xs font-medium text-emerald">
        <span className="size-1.5 rounded-full bg-emerald" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-sage" />
      Draft
    </span>
  );
}

function EmptyShop({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center shadow-[var(--shadow-lift)]">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Package className="size-7 text-muted-foreground" />
      </span>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{detail}</p>
      {action}
    </div>
  );
}
