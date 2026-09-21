import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Surface } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore, useCurrentUser, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/media")({
  component: MediaPage,
});

function MediaPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const addMedia = useAscStore((s) => s.addMedia);
  const removeMedia = useAscStore((s) => s.removeMedia);
  const ids = visibleClientIds(store, user);
  const rows = store.media.filter((m) => ids.includes(m.clientId));
  const clientId = user?.clientId ?? ids[0];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Photos"
        title="Photos"
        description="Pictures you can drop onto pages. JPG, PNG or WEBP, up to 4 MB."
        action={
          clientId ? (
            <label className="inline-flex h-10 cursor-pointer items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">
              Add photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !clientId) return;
                  void saveAction("Photo added", () =>
                    addMedia({
                      clientId,
                      name: file.name,
                      file,
                    }),
                  );
                }}
              />
            </label>
          ) : null
        }
      />
      {rows.length === 0 ? (
        <Surface>
          <div className="flex flex-col items-start gap-4 px-5 py-12">
            <h2 className="font-display text-2xl text-champagne">No photos yet.</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Add one picture. Store and Website pick from here.
            </p>
          </div>
        </Surface>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
            <li key={m.id} className="overflow-hidden border border-border bg-card">
              <div className="flex h-40 items-center justify-center bg-muted">
                {m.url ? (
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <p className="px-4 text-center text-sm text-muted-foreground">
                    Waiting for a file
                  </p>
                )}
              </div>
              <div className="flex items-start justify-between gap-2 p-3">
                <div>
                  <p className="text-sm text-champagne">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelative(m.addedAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void saveAction("Removed", () => removeMedia(m.id));
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
