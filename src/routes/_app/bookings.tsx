import { useState, type FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDay, formatTime } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useDeskSite } from "@/lib/desk-site";
import { useAscStore, useCurrentUser, useOwnClient, visibleClientIds } from "@/lib/store";
import type { BookingStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const store = useAscStore();
  const addBooking = useAscStore((s) => s.addBooking);
  const setBookingStatus = useAscStore((s) => s.setBookingStatus);
  const removeBooking = useAscStore((s) => s.removeBooking);
  const ids = visibleClientIds(store, user);
  const [picked, setPicked] = useState(own?.id ?? ids[0] ?? "");
  const clientId = own?.id ?? picked;
  const { clientSites, siteId, site, setSite } = useDeskSite(clientId);
  const rows = store.bookings
    .filter((b) => b.siteId === siteId)
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const allowed = user?.role === "operator" || own?.modules.bookings;
  const [open, setOpen] = useState(false);

  if (!allowed) {
    return (
      <PageHeader
        title="Bookings is off"
        description="This site does not take bookings. Ask ASC if you need the booking system."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Bookings"
        title="Bookings"
        description={
          site
            ? `Rooms, tables, slots on ${site.name}. Other sites keep their own bookings.`
            : "Add a public site first, then take bookings for that site."
        }
        action={
          <Button className="rounded-full" disabled={!siteId} onClick={() => setOpen(true)}>
            Add booking
          </Button>
        }
      />
      {user?.role === "operator" ? (
        <Field label="Client">
          <NativeSelect className="max-w-xs" value={clientId} onChange={(e) => setPicked(e.target.value)}>
            {store.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      {clientSites.length > 1 ? (
        <Field label="Site">
          <NativeSelect className="max-w-xs" value={siteId} onChange={(e) => setSite(e.target.value)}>
            {clientSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      <Surface>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            {!siteId
              ? "No public site yet. ASC attaches a website first."
              : "No bookings yet. Add one by hand, or wait for the public form."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">
                    {formatDay(b.startsAt)} · {formatTime(b.startsAt)}
                  </p>
                  <p className="mt-1 text-champagne">{b.guestName}</p>
                  <p className="text-sm text-muted-foreground">
                    {[b.email, b.phone].filter(Boolean).join(" · ") || "No contact"}
                  </p>
                  {b.notes ? (
                    <p className="mt-1 text-sm text-muted-foreground">{b.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {b.status}
                  </span>
                  {b.status === "requested" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void saveAction("Confirmed", () =>
                          setBookingStatus(b.id, "confirmed"),
                        );
                      }}
                    >
                      Confirm
                    </Button>
                  ) : null}
                  {b.status !== "cancelled" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void saveAction("Cancelled", () =>
                          setBookingStatus(b.id, "cancelled"),
                        );
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void saveAction("Removed", () => removeBooking(b.id));
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>
      <AddBookingDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(input) => {
          if (!clientId || !siteId) return;
          void saveAction("Saved in Manager", async () => {
            await addBooking({
              clientId,
              siteId,
              ...input,
              status: "requested" satisfies BookingStatus,
            });
            setOpen(false);
          });
        }}
      />
    </div>
  );
}

function AddBookingDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (input: {
    guestName: string;
    email: string;
    phone: string;
    startsAt: string;
    notes: string;
  }) => void;
}) {
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !when) return;
    onCreate({
      guestName: guestName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      startsAt: new Date(when).toISOString(),
      notes: notes.trim(),
    });
    setGuestName("");
    setEmail("");
    setPhone("");
    setWhen("");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add booking</DialogTitle>
            <DialogDescription>
              For a room, a table, a slot. The guest does not get an email from
              this yet.
            </DialogDescription>
          </DialogHeader>
          <Field label="Name">
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="When">
            <Input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
          </Field>
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
