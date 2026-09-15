import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { EmptyDesk } from "@/components/desk-ui";
import { Field, PageHeader, Surface } from "@/components/page-header";
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
import { useAscStore, useCurrentUser, useOwnClient, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const store = useAscStore();
  const addEvent = useAscStore((s) => s.addEvent);
  const removeEvent = useAscStore((s) => s.removeEvent);
  const ensureSections = useAscStore((s) => s.ensureSections);
  const updateSection = useAscStore((s) => s.updateSection);
  const ids = visibleClientIds(store, user);
  const rows = store.events
    .filter((e) => ids.includes(e.clientId))
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const allowed = user?.role === "operator" || own?.modules.calendar;
  const [open, setOpen] = useState(false);
  const clientId = user?.clientId ?? ids[0];

  if (!allowed) {
    return (
      <EmptyDesk
        title="Calendar is off"
        detail="This site does not run a public diary. Ask ASC if you need one."
      />
    );
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Calendar"
        title="Calendar"
        description="Services, camps, closed days. What you add here is what people see on the site."
        action={
          <Button className="rounded-full" onClick={() => setOpen(true)}>
            Add date
          </Button>
        }
      />
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const n = rows.filter((e) => isSameDay(parseISO(e.startsAt), d)).length;
          return (
            <div key={d.toISOString()} className="border border-border bg-card px-1 py-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {format(d, "EEE")}
              </p>
              <p className="mt-1 text-sm text-champagne">{format(d, "d")}</p>
              {n > 0 ? <span className="mt-1 inline-block size-1.5 rounded-full bg-emerald" /> : null}
            </div>
          );
        })}
      </div>
      <Surface>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            Empty diary. Add the next Sunday, a youth night, a held room.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((e) => {
              const sameDay = formatDay(e.startsAt) === formatDay(e.endsAt);
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-emerald">
                      {formatDay(e.startsAt)}
                      {sameDay ? "" : ` – ${formatDay(e.endsAt)}`}
                    </p>
                    <p className="mt-1 text-champagne">{e.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(e.startsAt)}–{formatTime(e.endsAt)}
                      {e.place ? ` · ${e.place}` : ""}
                    </p>
                    {e.notes ? (
                      <p className="mt-1 text-sm text-muted-foreground">{e.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!clientId) return;
                        void saveAction("On the homepage", async () => {
                          await ensureSections(clientId);
                          const sec = useAscStore
                            .getState()
                            .sections.find((s) => s.clientId === clientId && s.key === "this_sunday");
                          if (sec) await updateSection(sec.id, { payload: { eventId: e.id } });
                        });
                      }}
                    >
                      Use on homepage
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void saveAction("Taken off", () => removeEvent(e.id));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (!clientId) return;
              const fd = new FormData(e.currentTarget);
              const day = String(fd.get("day") ?? "");
              const start = String(fd.get("start") ?? "09:00");
              const end = String(fd.get("end") ?? "10:00");
              void saveAction("Saved in Manager", async () => {
                await addEvent({
                  clientId,
                  title: String(fd.get("title") ?? "").trim(),
                  startsAt: new Date(`${day}T${start}:00`).toISOString(),
                  endsAt: new Date(`${day}T${end}:00`).toISOString(),
                  place: String(fd.get("place") ?? "").trim(),
                  notes: String(fd.get("notes") ?? "").trim(),
                });
                setOpen(false);
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Add date</DialogTitle>
              <DialogDescription>Shows on the public calendar.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field label="Title">
                <Input name="title" required placeholder="Erediens" />
              </Field>
              <Field label="Day">
                <Input name="day" type="date" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts">
                  <Input name="start" type="time" required defaultValue="09:00" />
                </Field>
                <Field label="Ends">
                  <Input name="end" type="time" required defaultValue="10:30" />
                </Field>
              </div>
              <Field label="Place">
                <Input name="place" placeholder="Hoofsaal" />
              </Field>
              <Field label="Note">
                <Textarea name="notes" rows={2} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit" className="rounded-full">
                Save date
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
