import { useState } from "react";
import { Field } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveAction } from "@/lib/mutate";
import { useAscStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function MediaPicker({
  clientId,
  valuePath,
  onPick,
  label = "Photo",
}: {
  clientId: string;
  valuePath: string;
  onPick: (path: string) => void;
  label?: string;
}) {
  const media = useAscStore((s) => s.media.filter((m) => m.clientId === clientId));
  const addMedia = useAscStore((s) => s.addMedia);
  const [open, setOpen] = useState(false);
  const current = media.find((m) => m.path === valuePath);

  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-20 items-center justify-center overflow-hidden border border-border bg-muted"
        >
          {current?.url ? (
            <img src={current.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              None
            </span>
          )}
        </button>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(true)}>
            Pick from Photos
          </Button>
          {valuePath ? (
            <Button type="button" variant="ghost" onClick={() => onPick("")}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Photos</DialogTitle>
            <DialogDescription>One library. Pick a picture or add one.</DialogDescription>
          </DialogHeader>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">
            Upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void saveAction("Photo added", async () => {
                  await addMedia({ clientId, name: file.name, file });
                });
              }}
            />
          </label>
          {media.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Nothing in the cupboard yet.</p>
          ) : (
            <ul className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">
              {media.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(m.path);
                      setOpen(false);
                    }}
                    className={cn(
                      "block aspect-square w-full overflow-hidden border",
                      m.path === valuePath ? "border-emerald" : "border-border",
                    )}
                  >
                    {m.url ? (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </Field>
  );
}
