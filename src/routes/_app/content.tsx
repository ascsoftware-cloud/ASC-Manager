import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyDesk, GripHandle } from "@/components/desk-ui";
import { MediaPicker } from "@/components/media-picker";
import { Field, NativeSelect, PageHeader, Surface } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDay, formatZar, mondayOf, plainText, reorderIds, sundayOf } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore, useCurrentUser, useOwnClient, visibleClientIds } from "@/lib/store";
import type { AdvertLinkType, AdvertStatus, ContentSection, SectionKey, WeeklyAdvert } from "@/lib/types";

export const Route = createFileRoute("/_app/content")({
  component: WebsitePage,
});

const LABELS: Record<SectionKey, string> = {
  welcome: "Welcome",
  this_week: "This week",
  this_sunday: "This Sunday",
  featured: "Featured from the shop",
  hours: "Hours & contact",
};

function WebsitePage() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const clients = useAscStore((s) => s.clients);
  const ids = visibleClientIds(useAscStore.getState(), user);
  const [picked, setPicked] = useState(own?.id ?? ids[0] ?? "");
  const clientId = own?.id ?? picked;
  const client = clients.find((c) => c.id === clientId);
  const sections = useAscStore((s) =>
    s.sections.filter((x) => x.clientId === clientId).slice().sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const adverts = useAscStore((s) => s.adverts.filter((a) => a.clientId === clientId));
  const products = useAscStore((s) =>
    s.products.filter((p) => p.clientId === clientId && p.live).sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const events = useAscStore((s) =>
    s.events.filter((e) => e.clientId === clientId).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  );
  const ensureSections = useAscStore((s) => s.ensureSections);
  const updateSection = useAscStore((s) => s.updateSection);
  const reorderSections = useAscStore((s) => s.reorderSections);
  const saveAdvert = useAscStore((s) => s.saveAdvert);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) void ensureSections(clientId);
  }, [clientId, ensureSections]);

  const liveAdvert = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      adverts.find(
        (a) => a.status === "live" && a.startsOn <= today && a.endsOn >= today,
      ) ?? adverts.find((a) => a.status === "live") ?? null
    );
  }, [adverts]);

  const welcome = String(
    sections.find((s) => s.key === "welcome")?.payload.line ?? "",
  );

  if (!clientId) {
    return <EmptyDesk title="No site yet" detail="ASC will attach a public site to this tenant." />;
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Website"
          title="Website"
          description="The public homepage, section by section. Not a page builder."
        />
        {user?.role === "operator" ? (
          <NativeSelect className="max-w-xs" value={clientId} onChange={(e) => setPicked(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}

        <WeeklyAdvertCard
          clientId={clientId}
          storeOn={Boolean(client?.modules.store)}
          advert={liveAdvert}
          last={adverts.filter((a) => a.id !== liveAdvert?.id).slice(0, 1)[0]}
          products={products}
          events={events}
          onSave={(input) => saveAction("Advert saved", () => saveAdvert(input))}
        />

        <ul className="flex flex-col gap-3">
          {sections.map((sec) => (
            <li
              key={sec.id}
              draggable
              onDragStart={() => setDragId(sec.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragId) return;
                const ids = sections.map((s) => s.id);
                const next = reorderIds(ids, dragId, sec.id);
                setDragId(null);
                void saveAction("Order saved", () => reorderSections(clientId, next));
              }}
              className="border border-border bg-card"
            >
              <div className="flex items-center gap-1 border-b border-border px-1">
                <GripHandle />
                <p className="flex-1 font-mono text-[11px] uppercase tracking-[0.16em] text-champagne">
                  {LABELS[sec.key]}
                </p>
                <label className="flex min-h-11 items-center gap-2 pr-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {sec.visible ? "On" : "Hidden"}
                  </span>
                  <Switch
                    checked={sec.visible}
                    onCheckedChange={(on) => {
                      void saveAction(on ? "Section on" : "Section hidden", () =>
                        updateSection(sec.id, { visible: on }),
                      );
                    }}
                  />
                </label>
              </div>
              <div className="p-4">
                <SectionEditor
                  section={sec}
                  client={client}
                  products={products}
                  events={events}
                  advert={liveAdvert}
                  storeOn={Boolean(client?.modules.store)}
                  calendarOn={Boolean(client?.modules.calendar)}
                  onChange={(payload) => {
                    void saveAction("Saved", () => updateSection(sec.id, { payload }));
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="xl:sticky xl:top-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald">On your site</p>
        <div className="mx-auto mt-3 w-[280px] overflow-hidden rounded-[2rem] border border-border bg-ink p-3 shadow-[var(--shadow-lift)]">
          <div className="aspect-[9/16] overflow-y-auto bg-[#081410] px-4 py-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald">
              {client?.name}
            </p>
            {sections
              .filter((s) => s.visible)
              .map((s) => (
                <div key={s.id} className="mt-4">
                  {s.key === "welcome" ? (
                    <p className="font-display text-xl leading-tight text-champagne">
                      {welcome || "Welcome line"}
                    </p>
                  ) : null}
                  {s.key === "this_week" ? (
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-emerald">
                        This week
                      </p>
                      {liveAdvert && liveAdvert.status === "live" ? (
                        <>
                          {liveAdvert.photoUrl ? (
                            <img src={liveAdvert.photoUrl} alt="" className="mt-2 h-20 w-full object-cover" />
                          ) : null}
                          <p className="mt-2 text-sm text-champagne">{liveAdvert.headline || "Advert"}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No live advert</p>
                      )}
                    </div>
                  ) : null}
                  {s.key === "this_sunday" ? (
                    <p className="text-xs text-muted-foreground">
                      {String(s.payload.override || events[0]?.title || "Next gathering")}
                    </p>
                  ) : null}
                  {s.key === "featured" && client?.modules.store ? (
                    <ul className="mt-1 space-y-1">
                      {products
                        .filter((p) => (s.payload.productIds as string[] | undefined)?.includes(p.id) || p.featured)
                        .slice(0, 4)
                        .map((p) => (
                          <li key={p.id} className="text-xs text-champagne">
                            {p.name} · {formatZar(p.priceZar)}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                  {s.key === "hours" ? (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {client?.hours || "Hours from Business"}
                    </p>
                  ) : null}
                </div>
              ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionEditor({
  section,
  client,
  products,
  events,
  advert,
  storeOn,
  calendarOn,
  onChange,
}: {
  section: ContentSection;
  client?: { hours: string; phone: string; address: string; whatsapp: string } | undefined;
  products: { id: string; name: string }[];
  events: { id: string; title: string }[];
  advert: WeeklyAdvert | null;
  storeOn: boolean;
  calendarOn: boolean;
  onChange: (payload: Record<string, unknown>) => void;
}) {
  if (section.key === "welcome") {
    const line = String(section.payload.line ?? "");
    return (
      <Field label="Hero line">
        <Input
          defaultValue={line}
          maxLength={80}
          onBlur={(e) => onChange({ line: plainText(e.target.value) })}
        />
      </Field>
    );
  }
  if (section.key === "this_week") {
    return (
      <p className="text-sm text-muted-foreground">
        {advert?.status === "live"
          ? `Live: ${advert.headline || "This week"}`
          : "Edit the weekly advert card above. Expired adverts do not show on the public site."}
      </p>
    );
  }
  if (section.key === "this_sunday") {
    if (!calendarOn) {
      return (
        <Field label="Override">
          <Input
            defaultValue={String(section.payload.override ?? "")}
            onBlur={(e) => onChange({ ...section.payload, override: plainText(e.target.value) })}
          />
        </Field>
      );
    }
    return (
      <Field label="From calendar">
        <NativeSelect
          value={String(section.payload.eventId ?? "")}
          onChange={(e) => onChange({ ...section.payload, eventId: e.target.value })}
        >
          <option value="">Next upcoming</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </NativeSelect>
      </Field>
    );
  }
  if (section.key === "featured") {
    if (!storeOn) {
      return <p className="text-sm text-muted-foreground">Store is off. This section stays empty on the public site.</p>;
    }
    const picked = new Set((section.payload.productIds as string[] | undefined) ?? []);
    return (
      <ul className="space-y-2">
        {products.slice(0, 12).map((p) => (
          <li key={p.id}>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={picked.has(p.id)}
                onChange={(e) => {
                  const next = new Set(picked);
                  if (e.target.checked) next.add(p.id);
                  else next.delete(p.id);
                  onChange({ productIds: [...next].slice(0, 4) });
                }}
              />
              {p.name}
            </label>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
      {client?.hours || "Set hours on Business."}
      {client?.phone ? `\n${client.phone}` : ""}
      {client?.address ? `\n${client.address}` : ""}
    </p>
  );
}

function WeeklyAdvertCard({
  clientId,
  storeOn,
  advert,
  last,
  products,
  events,
  onSave,
}: {
  clientId: string;
  storeOn: boolean;
  advert: WeeklyAdvert | null;
  last?: WeeklyAdvert;
  products: { id: string; name: string; photoPath: string; priceZar: number }[];
  events: { id: string; title: string }[];
  onSave: (input: Parameters<ReturnType<typeof useAscStore.getState>["saveAdvert"]>[0]) => Promise<boolean>;
}) {
  const [startsOn, setStartsOn] = useState(advert?.startsOn ?? mondayOf());
  const [endsOn, setEndsOn] = useState(advert?.endsOn ?? sundayOf());
  const [headline, setHeadline] = useState(advert?.headline ?? "");
  const [body, setBody] = useState(advert?.body ?? "");
  const [photoPath, setPhotoPath] = useState(advert?.photoPath ?? "");
  const [status, setStatus] = useState<AdvertStatus>(advert?.status ?? "draft");
  const [linkType, setLinkType] = useState<AdvertLinkType>(advert?.linkType ?? "none");
  const [linkId, setLinkId] = useState(advert?.linkId ?? "");

  useEffect(() => {
    setStartsOn(advert?.startsOn ?? mondayOf());
    setEndsOn(advert?.endsOn ?? sundayOf());
    setHeadline(advert?.headline ?? "");
    setBody(advert?.body ?? "");
    setPhotoPath(advert?.photoPath ?? "");
    setStatus(advert?.status ?? "draft");
    setLinkType(advert?.linkType ?? "none");
    setLinkId(advert?.linkId ?? "");
  }, [advert?.id]);

  const expired = status === "live" && endsOn < new Date().toISOString().slice(0, 10);

  function pickProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLinkType("product");
    setLinkId(p.id);
    if (!headline) setHeadline(p.name);
    if (!photoPath) setPhotoPath(p.photoPath);
  }

  return (
    <Surface className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-emerald">This week</p>
          <p className="mt-1 font-display text-2xl text-champagne">Weekly advert</p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {expired ? "Expired" : status}
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="From">
          <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <MediaPicker clientId={clientId} valuePath={photoPath} onPick={setPhotoPath} label="Banner" />
      </div>
      <div className="mt-4 grid gap-4">
        <Field label="Headline">
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Body">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={240} />
        </Field>
      </div>
      {storeOn ? (
        <Field label="Pick a product">
          <NativeSelect value={linkType === "product" ? linkId : ""} onChange={(e) => pickProduct(e.target.value)}>
            <option value="">None</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : (
        <Field label="Link URL">
          <Input
            value={linkType === "url" ? linkId : ""}
            onChange={(e) => {
              setLinkType(e.target.value ? "url" : "none");
              setLinkId(e.target.value);
            }}
            placeholder="https://"
          />
        </Field>
      )}
      {!storeOn ? null : (
        <Field label="Or a date">
          <NativeSelect
            value={linkType === "event" ? linkId : ""}
            onChange={(e) => {
              setLinkType(e.target.value ? "event" : linkType);
              if (e.target.value) setLinkId(e.target.value);
            }}
          >
            <option value="">None</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["draft", "scheduled", "live"] as const).map((st) => (
          <Button
            key={st}
            type="button"
            variant={status === st ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setStatus(st)}
          >
            {st}
          </Button>
        ))}
        <Button
          type="button"
          className="rounded-full"
          onClick={() =>
            void onSave({
              id: advert?.id,
              clientId,
              startsOn,
              endsOn,
              status,
              photoPath,
              headline: plainText(headline),
              body: plainText(body),
              linkType,
              linkId,
            })
          }
        >
          Save advert
        </Button>
      </div>
      {last ? (
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Last week · {formatDay(last.startsOn)} · {last.headline || "No headline"}
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setHeadline(last.headline);
              setBody(last.body);
              setPhotoPath(last.photoPath);
              setLinkType(last.linkType);
              setLinkId(last.linkId);
              setStartsOn(mondayOf());
              setEndsOn(sundayOf());
              setStatus("draft");
            }}
          >
            Duplicate forward
          </Button>
        </div>
      ) : null}
    </Surface>
  );
}
