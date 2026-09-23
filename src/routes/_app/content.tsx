import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { EmptyDesk, GripHandle } from "@/components/desk-ui";
import { MediaPicker } from "@/components/media-picker";
import { Field, NativeSelect, PageHeader, Surface } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDay, formatZar, plainText, reorderIds } from "@/lib/format";
import { sectionEnabled } from "@/lib/modules";
import { saveAction } from "@/lib/mutate";
import { useActiveSite, useAscStore, useCurrentUser, useOwnClient, visibleClientIds } from "@/lib/store";
import type { AdvertLinkType, AdvertStatus, ContentSection, SectionKey, WeeklyAdvert } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/content")({
  component: WebsitePage,
});

const LABELS: Record<SectionKey, string> = {
  welcome: "Welcome",
  this_week: "Site pictures",
  this_sunday: "This Sunday",
  featured: "Featured from the shop",
  hours: "Hours & contact",
  seo: "SEO & social preview",
  faq: "Frequently asked questions",
  testimonials: "Testimonials",
  gallery: "Gallery",
  services: "Services & pricing",
  staff: "Staff",
};

function WebsitePage() {
  const user = useCurrentUser();
  const own = useOwnClient();
  const clients = useAscStore((s) => s.clients);
  const sites = useAscStore((s) => s.sites);
  const activeSite = useActiveSite();
  const setActiveSite = useAscStore((s) => s.setActiveSite);
  const ids = visibleClientIds(useAscStore.getState(), user);
  const [picked, setPicked] = useState(own?.id ?? ids[0] ?? "");
  const clientId = own?.id ?? picked;
  const client = clients.find((c) => c.id === clientId);
  const clientSites = sites.filter((site) => site.clientId === clientId && site.kind === "public");
  const [pickedSite, setPickedSite] = useState("");
  const storedSiteId = user?.role === "client" ? (activeSite?.id ?? "") : pickedSite;
  const siteId = clientSites.some((site) => site.id === storedSiteId)
    ? storedSiteId
    : (clientSites[0]?.id ?? "");
  const allSections = useAscStore((s) => s.sections);
  const allAdverts = useAscStore((s) => s.adverts);
  const allProducts = useAscStore((s) => s.products);
  const allEvents = useAscStore((s) => s.events);
  const sections = useMemo(
    () =>
      allSections
        .filter((x) => x.clientId === clientId && x.siteId === siteId)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [allSections, clientId, siteId],
  );
  const adverts = useMemo(
    () => allAdverts.filter((a) => a.clientId === clientId && a.siteId === siteId),
    [allAdverts, clientId, siteId],
  );
  const products = useMemo(
    () =>
      allProducts
        .filter((p) => p.clientId === clientId && p.siteId === siteId && p.live)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [allProducts, clientId, siteId],
  );
  const events = useMemo(
    () =>
      allEvents
        .filter((e) => e.clientId === clientId && e.siteId === siteId)
        .slice()
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [allEvents, clientId, siteId],
  );
  const ensureSections = useAscStore((s) => s.ensureSections);
  const updateSection = useAscStore((s) => s.updateSection);
  const reorderSections = useAscStore((s) => s.reorderSections);
  const [dragId, setDragId] = useState<string | null>(null);
  const hash = useRouterState({
    select: (s) => (s.location.hash || "").replace(/^#/, ""),
  });

  useEffect(() => {
    if (clientId && siteId) void ensureSections(clientId, siteId);
  }, [clientId, siteId, ensureSections]);

  useEffect(() => {
    if (!hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`section-${hash}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [hash, siteId, sections.length]);

  const welcome = String(
    sections.find((s) => s.key === "welcome")?.payload.line ?? "",
  );

  if (!clientId || !siteId) {
    return (
      <EmptyDesk
        title="No site yet"
        detail={
          user?.role === "client"
            ? "ASC still needs to attach a public site to this account. SEO, FAQ, gallery and the rest show here after that."
            : "Add a public site on Sites, then this client can edit it from Website."
        }
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Website"
          title="Website"
          description="Welcome, hours, and every extra ASC switched on for this public site — SEO, FAQ, testimonials, gallery, services, staff."
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
        {clientSites.length > 1 ? (
          <NativeSelect
            className="max-w-xs"
            value={siteId}
            onChange={(e) => {
              const next = e.target.value;
              if (user?.role === "client") setActiveSite(next);
              else setPickedSite(next);
            }}
          >
            {clientSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </NativeSelect>
        ) : null}

        {client?.modules.advert ? (
          <SiteMediaBoard
            clientId={clientId}
            siteId={siteId}
            storeOn={Boolean(client?.modules.store)}
            adverts={adverts}
            products={products}
            events={events}
          />
        ) : null}

        <ul className="flex flex-col gap-3">
          {sections
            .filter((sec) => sectionEnabled(client, sec.key))
            .map((sec) => (
            <li
              id={`section-${sec.key}`}
              key={sec.id}
              draggable
              onDragStart={() => setDragId(sec.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragId) return;
                const ids = sections.map((s) => s.id);
                const next = reorderIds(ids, dragId, sec.id);
                setDragId(null);
                        void saveAction("Order saved", () => reorderSections(siteId, next));
              }}
              className={cn(
                "scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]",
                hash === sec.key && "ring-2 ring-emerald",
              )}
            >
              <div className="flex items-center gap-1 border-b border-border px-1">
                <GripHandle />
                <p className="flex-1 text-sm font-semibold text-foreground">
                  {LABELS[sec.key]}
                </p>
                <label className="flex min-h-11 items-center gap-2 pr-3">
                  <span className="text-xs font-medium text-muted-foreground">
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
                  storeOn={Boolean(client?.modules.store)}
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
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On your site</p>
        <div className="mx-auto mt-3 w-[280px] overflow-hidden rounded-[2rem] border border-border bg-ink p-3 shadow-[var(--shadow-lift)]">
          <div className="aspect-[9/16] overflow-y-auto bg-[#081410] px-4 py-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald">
              {client?.name}
            </p>
            {sections
              .filter((s) => s.visible)
              .filter((s) => sectionEnabled(client, s.key))
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
                        Pictures
                      </p>
                      {adverts.filter((a) => a.status === "live").length === 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">Nothing live</p>
                      ) : (
                        adverts
                          .filter((a) => a.status === "live")
                          .slice(0, 5)
                          .map((a) => (
                            <p key={a.id} className="mt-1 text-xs text-champagne">
                              {a.headline || "Picture"}
                            </p>
                          ))
                      )}
                    </div>
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
                  {s.key === "seo" ? (
                    <p className="text-xs text-muted-foreground">
                      {String(s.payload.title ?? "SEO title")}
                    </p>
                  ) : null}
                  {(["faq", "testimonials", "gallery", "services", "staff"] as SectionKey[]).includes(s.key) ? (
                    <p className="text-xs text-muted-foreground">
                      {Array.isArray(s.payload.items) ? `${s.payload.items.length} items` : "No items yet"}
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
  storeOn,
  onChange,
}: {
  section: ContentSection;
  client?: { hours: string; phone: string; address: string; whatsapp: string } | undefined;
  products: { id: string; name: string }[];
  storeOn: boolean;
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
        Pictures you mark Live show in this slot on the public site for their dates. You can have more than one up at a time.
      </p>
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
  if (section.key === "seo") {
    return <SeoEditor section={section} onChange={onChange} />;
  }
  if (section.key === "faq") {
    return (
      <ListEditor
        section={section}
        onChange={onChange}
        fields={["question", "answer"]}
        labels={["Question", "Answer"]}
        title="Questions visitors ask"
      />
    );
  }
  if (section.key === "testimonials") {
    return (
      <ListEditor
        section={section}
        onChange={onChange}
        fields={["quote", "name", "role"]}
        labels={["Quote", "Name", "Role or company"]}
        title="Customer quotes"
      />
    );
  }
  if (section.key === "gallery") {
    return (
      <ListEditor
        section={section}
        onChange={onChange}
        fields={["image", "caption", "alt"]}
        labels={["Image URL", "Caption", "Alt text"]}
        title="Gallery images"
      />
    );
  }
  if (section.key === "services") {
    return (
      <ListEditor
        section={section}
        onChange={onChange}
        fields={["name", "price", "description"]}
        labels={["Service", "Price", "Description"]}
        title="Services or packages"
      />
    );
  }
  if (section.key === "staff") {
    return (
      <ListEditor
        section={section}
        onChange={onChange}
        fields={["name", "role", "bio", "photo"]}
        labels={["Name", "Role", "Bio", "Photo URL"]}
        title="People on the team"
      />
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

function SeoEditor({
  section,
  onChange,
}: {
  section: ContentSection;
  onChange: (payload: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-4">
      <Field label="Page title">
        <Input
          defaultValue={String(section.payload.title ?? "")}
          maxLength={60}
          onBlur={(e) => onChange({ ...section.payload, title: plainText(e.target.value) })}
        />
      </Field>
      <Field label="Meta description">
        <Textarea
          defaultValue={String(section.payload.description ?? "")}
          maxLength={160}
          rows={3}
          onBlur={(e) => onChange({ ...section.payload, description: plainText(e.target.value) })}
        />
      </Field>
      <Field label="Social image URL">
        <Input
          defaultValue={String(section.payload.image ?? "")}
          placeholder="https://"
          onBlur={(e) => onChange({ ...section.payload, image: e.target.value.trim() })}
        />
      </Field>
    </div>
  );
}

function ListEditor({
  section,
  onChange,
  fields,
  labels,
  title,
}: {
  section: ContentSection;
  onChange: (payload: Record<string, unknown>) => void;
  fields: string[];
  labels: string[];
  title: string;
}) {
  const rawItems = Array.isArray(section.payload.items) ? section.payload.items : [];
  const initialItems = rawItems.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
  );
  const [items, setItems] = useState(initialItems);

  function update(index: number, field: string, value: string, save = false) {
    const next = items.map((item) => ({ ...item }));
    next[index][field] = value;
    setItems(next);
    if (save) onChange({ ...section.payload, items: next });
  }

  function add() {
    onChange({
      ...section.payload,
      items: [...items, Object.fromEntries(fields.map((field) => [field, ""]))],
    });
    setItems([...items, Object.fromEntries(fields.map((field) => [field, ""]))]);
  }

  function remove(index: number) {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    onChange({ ...section.payload, items: next });
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      {items.map((item, index) => (
        <div key={index} className="grid gap-3 border border-border p-3">
          {fields.map((field, fieldIndex) => (
            <Field key={field} label={labels[fieldIndex]}>
              {field === "answer" || field === "quote" || field === "description" || field === "bio" ? (
                <Textarea
                  value={String(item[field] ?? "")}
                  rows={2}
                  onChange={(e) => update(index, field, e.target.value)}
                  onBlur={(e) => update(index, field, plainText(e.target.value), true)}
                />
              ) : (
                <Input
                  value={String(item[field] ?? "")}
                  onChange={(e) => update(index, field, e.target.value)}
                  onBlur={(e) => update(index, field, plainText(e.target.value), true)}
                />
              )}
            </Field>
          ))}
          <Button type="button" variant="ghost" onClick={() => remove(index)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add}>
        Add item
      </Button>
    </div>
  );
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function SiteMediaBoard({
  clientId,
  siteId,
  storeOn,
  adverts,
  products,
  events,
}: {
  clientId: string;
  siteId: string;
  storeOn: boolean;
  adverts: WeeklyAdvert[];
  products: { id: string; name: string; photoPath: string; priceZar: number }[];
  events: { id: string; title: string }[];
}) {
  const saveAdvert = useAscStore((s) => s.saveAdvert);
  const removeAdvert = useAscStore((s) => s.removeAdvert);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(
    adverts[0]?.id ?? null,
  );
  const advert =
    selectedId && selectedId !== "new"
      ? (adverts.find((a) => a.id === selectedId) ?? null)
      : null;

  const [startsOn, setStartsOn] = useState(advert?.startsOn ?? todayStamp());
  const [endsOn, setEndsOn] = useState(advert?.endsOn ?? todayStamp());
  const [headline, setHeadline] = useState(advert?.headline ?? "");
  const [body, setBody] = useState(advert?.body ?? "");
  const [photoPath, setPhotoPath] = useState(advert?.photoPath ?? "");
  const [status, setStatus] = useState<AdvertStatus>(advert?.status ?? "draft");
  const [linkType, setLinkType] = useState<AdvertLinkType>(advert?.linkType ?? "none");
  const [linkId, setLinkId] = useState(advert?.linkId ?? "");

  useEffect(() => {
    if (selectedId === "new") {
      setStartsOn(todayStamp());
      setEndsOn(todayStamp());
      setHeadline("");
      setBody("");
      setPhotoPath("");
      setStatus("draft");
      setLinkType("none");
      setLinkId("");
      return;
    }
    setStartsOn(advert?.startsOn ?? todayStamp());
    setEndsOn(advert?.endsOn ?? todayStamp());
    setHeadline(advert?.headline ?? "");
    setBody(advert?.body ?? "");
    setPhotoPath(advert?.photoPath ?? "");
    setStatus(advert?.status ?? "draft");
    setLinkType(advert?.linkType ?? "none");
    setLinkId(advert?.linkId ?? "");
  }, [
    advert?.body,
    advert?.endsOn,
    advert?.headline,
    advert?.id,
    advert?.linkId,
    advert?.linkType,
    advert?.photoPath,
    advert?.startsOn,
    advert?.status,
    selectedId,
  ]);

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
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald">Site pictures</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">Add pictures to the site</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            This slot is on your public homepage. Add a photo, give it a caption if you want, and mark it Live.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-full"
          onClick={() => setSelectedId("new")}
        >
          Add picture
        </Button>
      </div>
      {adverts.length > 0 ? (
        <ul className="mt-5 divide-y divide-border border border-border">
          {adverts.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setSelectedId(a.id)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left",
                  selectedId === a.id ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <span className="text-sm text-champagne">{a.headline || "Untitled picture"}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {a.status === "draft" ? "hidden" : a.status} · {formatDay(a.startsOn)}–{formatDay(a.endsOn)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No pictures on the site yet.</p>
      )}
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {selectedId === "new" ? "New picture" : expired ? "Dates ended" : status === "draft" ? "Hidden" : status}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Show from">
          <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </Field>
        <Field label="Show until">
          <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <MediaPicker
          clientId={clientId}
          valuePath={photoPath}
          onPick={setPhotoPath}
          label="Picture"
          variant="dropzone"
        />
      </div>
      <div className="mt-4 grid gap-4">
        <Field label="Caption">
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={80}
            placeholder="Optional"
          />
        </Field>
        <Field label="Note">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={240}
            placeholder="Optional"
          />
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
        {([
          ["draft", "Hidden"],
          ["scheduled", "Scheduled"],
          ["live", "Live"],
        ] as const).map(([st, label]) => (
          <Button
            key={st}
            type="button"
            variant={status === st ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setStatus(st)}
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          className="rounded-full"
          onClick={() =>
            void saveAction("Picture saved", async () => {
              await saveAdvert({
                id: selectedId === "new" ? undefined : advert?.id,
                clientId,
                siteId,
                startsOn,
                endsOn,
                status,
                photoPath,
                headline: plainText(headline),
                body: plainText(body),
                linkType,
                linkId,
              });
              setSelectedId(null);
            })
          }
        >
          Save
        </Button>
        {advert ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void saveAction("Removed", async () => {
                await removeAdvert(advert.id);
                setSelectedId(null);
              });
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </Surface>
  );
}
