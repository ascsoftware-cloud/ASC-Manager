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
import { formatZar } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore, useCurrentUser, useOwnClient, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/store")({
  component: StorePage,
});

function StorePage() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const store = useAscStore();
  const addProduct = useAscStore((s) => s.addProduct);
  const updateProduct = useAscStore((s) => s.updateProduct);
  const removeProduct = useAscStore((s) => s.removeProduct);
  const ids = visibleClientIds(store, user);
  const rows = store.products.filter((p) => ids.includes(p.clientId));
  const allowed = user?.role === "operator" || own?.modules.store;
  const [open, setOpen] = useState(false);
  const clientId = user?.clientId ?? ids[0];

  if (!allowed) {
    return (
      <PageHeader
        title="Store is off"
        description="This site does not sell anything. Ask ASC if you need a shop."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Store"
        title="Store"
        description="What people can buy on your site. Live means it shows. Hidden stays in the cupboard."
        action={
          <Button className="rounded-full" onClick={() => setOpen(true)}>
            Add item
          </Button>
        }
      />
      <Surface>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            No items yet. Add a hoodie, a book, a part — then flip it live.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">On the site</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4">
                    <p className="text-champagne">{p.name}</p>
                    {p.note ? (
                      <p className="text-xs text-muted-foreground">{p.note}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-champagne">{formatZar(p.priceZar)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{p.stock}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        void saveAction(
                          p.live ? "Hidden in Manager" : "Marked live in Manager",
                          () => updateProduct(p.id, { live: !p.live }),
                        );
                      }}
                    >
                      <StatusDot status={p.live ? "live" : "hidden"} />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void saveAction("Removed", () => removeProduct(p.id));
                      }}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (!clientId) return;
              const fd = new FormData(e.currentTarget);
              void saveAction("Saved in Manager", async () => {
                await addProduct({
                  clientId,
                  name: String(fd.get("name") ?? "").trim(),
                  priceZar: Number(fd.get("price") || 0),
                  stock: Number(fd.get("stock") || 0),
                  live: true,
                  photo: "",
                  note: String(fd.get("note") ?? "").trim(),
                });
                setOpen(false);
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Add item</DialogTitle>
              <DialogDescription>Goes live on your shop as soon as you save.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field label="Name">
                <Input name="name" required placeholder="Collage hoodie" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (R)">
                  <Input name="price" type="number" min={0} step={1} required defaultValue={0} />
                </Field>
                <Field label="Stock">
                  <Input name="stock" type="number" min={0} step={1} required defaultValue={1} />
                </Field>
              </div>
              <Field label="Note">
                <Textarea name="note" rows={2} placeholder="Size, colour, who it is for" />
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit" className="rounded-full">
                Save item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
