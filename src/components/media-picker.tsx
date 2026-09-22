import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
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
  variant = "default",
}: {
  clientId: string;
  valuePath: string;
  onPick: (path: string) => void;
  label?: string;
  variant?: "default" | "dropzone";
}) {
  const allMedia = useAscStore((s) => s.media);
  const media = useMemo(
    () => allMedia.filter((m) => m.clientId === clientId),
    [allMedia, clientId],
  );
  const addMedia = useAscStore((s) => s.addMedia);
  const removeMedia = useAscStore((s) => s.removeMedia);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const current = media.find((m) => m.path === valuePath);

  async function ingest(file: File) {
    await saveAction("Photo added", async () => {
      const { path } = await addMedia({ clientId, name: file.name, file });
      onPick(path);
    });
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void ingest(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void ingest(file);
  }

  const library = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Photos</DialogTitle>
          <DialogDescription>Pick a picture from your library, or upload a new one.</DialogDescription>
        </DialogHeader>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Upload
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={onFileInput}
          />
        </label>
        {media.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No photos yet. Upload one above.</p>
        ) : (
          <ul className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">
            {media.map((m) => (
              <li key={m.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    onPick(m.path);
                    setOpen(false);
                  }}
                  className={cn(
                    "block aspect-square w-full overflow-hidden rounded-md border",
                    m.path === valuePath ? "border-emerald" : "border-border",
                  )}
                >
                  {m.url ? (
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${m.name}`}
                  title="Remove photo"
                  onClick={() => {
                    void saveAction("Photo removed", async () => {
                      await removeMedia(m.id);
                      if (m.path === valuePath) onPick("");
                    });
                  }}
                  className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-black/70 text-white shadow-sm transition-colors hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );

  if (variant === "dropzone") {
    return (
      <div className="flex flex-col gap-3">
        {current?.url ? (
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            <img src={current.url} alt="" className="max-h-72 w-full object-contain bg-muted" />
            <div className="flex flex-wrap gap-2 border-t border-border p-3">
              <Button type="button" variant="outline" onClick={() => setOpen(true)}>
                Change
              </Button>
              <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md px-3 text-sm font-medium text-foreground shadow-[var(--shadow-border)] hover:bg-accent">
                Upload new
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={onFileInput}
                />
              </label>
              <Button type="button" variant="ghost" onClick={() => onPick("")}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
              over ? "border-ring bg-accent" : "border-input bg-muted/40",
            )}
          >
            <ImagePlus className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Add photos</p>
            <p className="text-sm text-muted-foreground">Drag and drop, or upload from this device.</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                Upload
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={onFileInput}
                />
              </label>
              <Button type="button" variant="outline" onClick={() => setOpen(true)}>
                Choose from Photos
              </Button>
            </div>
          </div>
        )}
        {library}
      </div>
    );
  }

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
      {library}
    </Field>
  );
}
