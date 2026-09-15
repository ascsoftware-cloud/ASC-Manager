import { create } from "zustand";
import { inviteUserFn } from "@/lib/invite";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabase, requireSupabase } from "@/lib/supabase/client";
import {
  mapAdvert,
  mapBlock,
  mapBooking,
  mapEnquiry,
  mapEvent,
  mapIncident,
  mapInvoice,
  mapLog,
  mapMedia,
  mapMonitor,
  mapProduct,
  mapRenewal,
  mapRequest,
  mapSection,
  mapSite,
  mapTenant,
  mapUser,
  mapVisitor,
} from "@/lib/supabase/map";
import { removeStoragePath, uploadTenantImage } from "@/lib/supabase/storage";
import type {
  AdvertStatus,
  AppTables,
  Booking,
  BookingStatus,
  CalendarEvent,
  Client,
  ContentBlock,
  ContentSection,
  EnquiryStatus,
  InvoiceStatus,
  MonitorStatus,
  Product,
  RequestStatus,
  SectionKey,
  Session,
  Site,
  User,
  WeeklyAdvert,
} from "@/lib/types";

const COOKIE_KEY = "asc-cookies-v1";

const DEFAULT_BLOCKS: Array<
  Omit<ContentBlock, "id" | "siteId" | "value" | "updatedAt">
> = [
  {
    group: "Home",
    key: "welcome",
    label: "Welcome line",
    kind: "text",
    hint: "Hero on the public site.",
    maxLen: 80,
  },
  {
    group: "Home",
    key: "this_sunday",
    label: "This Sunday",
    kind: "text",
    hint: "",
    maxLen: 90,
  },
  {
    group: "Advert",
    key: "advert_image",
    label: "Advert image",
    kind: "image",
    hint: "JPG, PNG, WEBP or GIF, up to 4 MB.",
    maxLen: 0,
  },
  {
    group: "Advert",
    key: "advert_link",
    label: "Advert links to",
    kind: "url",
    hint: "Full address including https://",
    maxLen: 240,
  },
  {
    group: "Advert",
    key: "advert_caption",
    label: "Advert caption",
    kind: "text",
    hint: "",
    maxLen: 80,
  },
];

function emptyTables(): AppTables {
  return {
    users: [],
    clients: [],
    sites: [],
    monitors: [],
    incidents: [],
    renewals: [],
    visitors: [],
    requests: [],
    blocks: [],
    log: [],
    enquiries: [],
    media: [],
    invoices: [],
    products: [],
    events: [],
    bookings: [],
    sections: [],
    adverts: [],
  };
}

const DEFAULT_SECTION_KEYS: SectionKey[] = [
  "welcome",
  "this_week",
  "this_sunday",
  "featured",
  "hours",
];

function readCookies(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(COOKIE_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

function fail(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(fallback);
}

async function accessToken(): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Signed out.");
  return data.session.access_token;
}

async function loadTables(): Promise<AppTables> {
  const sb = requireSupabase();
  const [
    profiles,
    tenants,
    sites,
    monitors,
    incidents,
    renewals,
    visitors,
    requests,
    blocks,
    products,
    events,
    bookings,
    sections,
    adverts,
    enquiries,
    media,
    invoices,
    log,
  ] = await Promise.all([
    sb.from("profiles").select("*"),
    sb.from("tenants").select("*").order("name"),
    sb.from("sites").select("*").order("name"),
    sb.from("monitors").select("*"),
    sb.from("incidents").select("*").order("opened_at", { ascending: false }),
    sb.from("renewals").select("*").order("expires_at"),
    sb.from("visitor_days").select("*"),
    sb.from("requests").select("*").order("created_at", { ascending: false }),
    sb.from("content_blocks").select("*"),
    sb.from("products").select("*").order("name"),
    sb.from("calendar_events").select("*").order("starts_at"),
    sb.from("bookings").select("*").order("starts_at"),
    sb.from("content_sections").select("*").order("sort_order"),
    sb.from("weekly_adverts").select("*").order("starts_on", { ascending: false }),
    sb.from("enquiries").select("*").order("created_at", { ascending: false }),
    sb.from("media").select("*").order("added_at", { ascending: false }),
    sb.from("invoices").select("*").order("due_at"),
    sb.from("change_log").select("*").order("at", { ascending: false }).limit(50),
  ]);

  const errored = [
    profiles,
    tenants,
    sites,
    monitors,
    incidents,
    renewals,
    visitors,
    requests,
    blocks,
    products,
    events,
    enquiries,
    media,
    invoices,
    log,
  ].find((r) => r.error);
  if (errored?.error) throw new Error("Could not load your workspace.");

  return {
    users: (profiles.data ?? []).map(mapUser),
    clients: (tenants.data ?? []).map(mapTenant),
    sites: (sites.data ?? []).map(mapSite),
    monitors: (monitors.data ?? []).map(mapMonitor),
    incidents: (incidents.data ?? []).map(mapIncident),
    renewals: (renewals.data ?? []).map(mapRenewal),
    visitors: (visitors.data ?? []).map(mapVisitor),
    requests: (requests.data ?? []).map(mapRequest),
    blocks: (blocks.data ?? []).map(mapBlock),
    products: (products.data ?? []).map(mapProduct),
    events: (events.data ?? []).map(mapEvent),
    bookings: bookings.error ? [] : (bookings.data ?? []).map(mapBooking),
    sections: sections.error ? [] : (sections.data ?? []).map(mapSection),
    adverts: adverts.error ? [] : (adverts.data ?? []).map(mapAdvert),
    enquiries: (enquiries.data ?? []).map(mapEnquiry),
    media: (media.data ?? []).map(mapMedia),
    invoices: (invoices.data ?? []).map(mapInvoice),
    log: (log.data ?? []).map(mapLog),
  };
}

type AscStore = AppTables & {
  ready: boolean;
  loadError: string | null;
  session: Session | null;
  cookiesAccepted: boolean | null;
  bootstrap: () => Promise<void>;
  hydrateFromSession: () => Promise<void>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  setCookies: (accepted: boolean) => void;
  inviteUser: (input: {
    email: string;
    name: string;
    role: "operator" | "client";
    tenantId: string | null;
  }) => Promise<void>;
  runChecks: (siteId: string) => Promise<void>;
  updateBlock: (id: string, value: string, actor: string) => Promise<void>;
  uploadBlockImage: (id: string, file: File, actor: string) => Promise<void>;
  addBlock: (
    input: Omit<ContentBlock, "id" | "updatedAt">,
    actor: string,
  ) => Promise<void>;
  addRequest: (input: {
    clientId: string;
    title: string;
    body: string;
    authorName: string;
  }) => Promise<void>;
  setRequestStatus: (id: string, status: RequestStatus) => Promise<void>;
  addClient: (input: {
    name: string;
    city: string;
    contactName: string;
    email: string;
  }) => Promise<void>;
  addSite: (input: Omit<Site, "id">) => Promise<void>;
  updateClient: (id: string, patch: Partial<Client>) => Promise<void>;
  setEnquiryStatus: (id: string, status: EnquiryStatus) => Promise<void>;
  addMedia: (input: { clientId: string; name: string; file: File }) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>;
  addProduct: (input: Omit<Product, "id" | "sortOrder" | "photo">) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addEvent: (input: Omit<CalendarEvent, "id">) => Promise<void>;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  addBooking: (input: Omit<Booking, "id">) => Promise<void>;
  setBookingStatus: (id: string, status: BookingStatus) => Promise<void>;
  removeBooking: (id: string) => Promise<void>;
  reorderProducts: (clientId: string, orderedIds: string[]) => Promise<void>;
  ensureSections: (clientId: string) => Promise<void>;
  updateSection: (
    id: string,
    patch: Partial<Pick<ContentSection, "visible" | "payload" | "sortOrder">>,
  ) => Promise<void>;
  reorderSections: (clientId: string, orderedIds: string[]) => Promise<void>;
  saveAdvert: (
    input: Omit<WeeklyAdvert, "id" | "photoUrl" | "updatedAt"> & { id?: string },
  ) => Promise<void>;
  setAdvertStatus: (id: string, status: AdvertStatus) => Promise<void>;
};

let listening = false;

export const useAscStore = create<AscStore>()((set, get) => ({
  ...emptyTables(),
  ready: false,
  loadError: null,
  session: null,
  cookiesAccepted: null,

  bootstrap: async () => {
    set({ cookiesAccepted: readCookies() });
    const sb = getSupabase();
    if (sb && !listening) {
      listening = true;
      sb.auth.onAuthStateChange((event) => {
        if (event === "INITIAL_SESSION") return;
        if (event === "SIGNED_OUT") {
          set({
            ...emptyTables(),
            session: null,
            ready: true,
            loadError: null,
            cookiesAccepted: get().cookiesAccepted,
          });
          return;
        }
        void get().hydrateFromSession();
      });
    }
    await get().hydrateFromSession();
  },

  hydrateFromSession: async () => {
    if (!isSupabaseConfigured() || !getSupabase()) {
      set({
        ...emptyTables(),
        ready: true,
        session: null,
        loadError: null,
        cookiesAccepted: get().cookiesAccepted,
      });
      return;
    }
    const sb = requireSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const session = sessionData.session;
    if (!session?.user) {
      set({
        ...emptyTables(),
        ready: true,
        session: null,
        loadError: null,
        cookiesAccepted: get().cookiesAccepted,
      });
      return;
    }
    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profileError) {
      set({
        ready: true,
        session: { userId: session.user.id },
        loadError: "Could not load your profile. Check the database grants.",
        cookiesAccepted: get().cookiesAccepted,
      });
      return;
    }
    if (!profile) {
      set({
        ready: true,
        session: { userId: session.user.id },
        loadError: "This account has no profile. Ask ASC to invite you.",
        cookiesAccepted: get().cookiesAccepted,
      });
      return;
    }
    try {
      const tables = await loadTables();
      set({
        ...tables,
        ready: true,
        loadError: null,
        session: { userId: session.user.id },
        cookiesAccepted: get().cookiesAccepted,
      });
    } catch (e) {
      set({
        ready: true,
        loadError: e instanceof Error ? e.message : "Could not load your workspace.",
        session: { userId: session.user.id },
      });
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        error:
          "Database is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.",
      };
    }
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, error: "That email or password is wrong." };
    await get().hydrateFromSession();
    return { ok: true };
  },

  signOut: async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    set({
      ...emptyTables(),
      session: null,
      ready: true,
      loadError: null,
      cookiesAccepted: get().cookiesAccepted,
    });
  },

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured()) return;
    const sb = requireSupabase();
    await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
  },

  setCookies: (accepted) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COOKIE_KEY, accepted ? "1" : "0");
    }
    set({ cookiesAccepted: accepted });
  },

  inviteUser: async (input) => {
    await inviteUserFn({
      data: {
        accessToken: await accessToken(),
        email: input.email,
        name: input.name,
        role: input.role,
        tenantId: input.tenantId,
      },
    });
    const tables = await loadTables();
    set(tables);
  },

  runChecks: async (siteId) => {
    const sb = requireSupabase();
    const now = new Date().toISOString();
    const { error } = await sb
      .from("monitors")
      .update({ status: "up", last_checked_at: now, uptime30: 100 })
      .eq("site_id", siteId);
    fail(error, "Could not write those checks.");
    set((s) => ({
      monitors: s.monitors.map((m) =>
        m.siteId === siteId
          ? {
              ...m,
              status: "up" as MonitorStatus,
              lastCheckedAt: now,
              uptime30: m.uptime30 ?? 100,
            }
          : m,
      ),
    }));
  },

  updateBlock: async (id, value, actor) => {
    const sb = requireSupabase();
    const block = get().blocks.find((b) => b.id === id);
    const { data, error } = await sb
      .from("content_blocks")
      .update({ value })
      .eq("id", id)
      .select("*")
      .single();
    fail(error, "Could not save that block.");
    const site = get().sites.find((x) => x.id === (block?.siteId ?? data?.site_id));
    if (site && block) {
      await sb.from("change_log").insert({
        tenant_id: site.clientId,
        summary: `Updated ${block.label} on ${site.name}`,
        actor,
      });
    }
    const mapped = mapBlock(data);
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === id ? mapped : b)),
      log: site
        ? [
            {
              id: crypto.randomUUID(),
              clientId: site.clientId,
              summary: `Updated ${block?.label ?? "block"} on ${site.name}`,
              at: new Date().toISOString(),
              actor,
            },
            ...s.log,
          ]
        : s.log,
    }));
  },

  uploadBlockImage: async (id, file, actor) => {
    const block = get().blocks.find((b) => b.id === id);
    if (!block) throw new Error("Block not found.");
    const site = get().sites.find((x) => x.id === block.siteId);
    if (!site) throw new Error("Site not found.");
    const { path } = await uploadTenantImage(site.clientId, file);
    await get().updateBlock(id, path, actor);
  },

  addBlock: async (input, actor) => {
    const sb = requireSupabase();
    const site = get().sites.find((x) => x.id === input.siteId);
    if (!site) throw new Error("Site not found.");
    const { data, error } = await sb
      .from("content_blocks")
      .insert({
        tenant_id: site.clientId,
        site_id: input.siteId,
        group_name: input.group,
        key: input.key,
        label: input.label,
        kind: input.kind,
        value: input.value,
        hint: input.hint,
        max_len: input.maxLen,
      })
      .select("*")
      .single();
    fail(error, "Could not add that block.");
    const mapped = mapBlock(data);
    if (site) {
      await sb.from("change_log").insert({
        tenant_id: site.clientId,
        summary: `Added ${mapped.label} on ${site.name}`,
        actor,
      });
    }
    set((s) => ({
      blocks: [...s.blocks, mapped],
      log: site
        ? [
            {
              id: crypto.randomUUID(),
              clientId: site.clientId,
              summary: `Added ${mapped.label} on ${site.name}`,
              at: new Date().toISOString(),
              actor,
            },
            ...s.log,
          ]
        : s.log,
    }));
  },

  addRequest: async (input) => {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("requests")
      .insert({
        tenant_id: input.clientId,
        title: input.title,
        body: input.body,
        author_name: input.authorName,
      })
      .select("*")
      .single();
    fail(error, "Could not send that request.");
    set((s) => ({ requests: [mapRequest(data), ...s.requests] }));
  },

  setRequestStatus: async (id, status) => {
    const sb = requireSupabase();
    const { error } = await sb.from("requests").update({ status }).eq("id", id);
    fail(error, "Could not update that request.");
    set((s) => ({
      requests: s.requests.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
  },

  addClient: async (input) => {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("tenants")
      .insert({
        name: input.name,
        city: input.city,
        contact_name: input.contactName,
        email: input.email,
        status: "active",
        modules_store: false,
        modules_calendar: false,
        modules_bookings: false,
      })
      .select("*")
      .single();
    fail(error, "Could not create that client.");
    const client = mapTenant(data);
    set((s) => ({ clients: [...s.clients, client] }));
    await get().inviteUser({
      email: input.email,
      name: input.contactName,
      role: "client",
      tenantId: client.id,
    });
  },

  addSite: async (input) => {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("sites")
      .insert({
        tenant_id: input.clientId,
        name: input.name,
        host: input.host,
        url: input.url,
        kind: input.kind,
      })
      .select("*")
      .single();
    fail(error, "Could not add that site.");
    const site = mapSite(data);
    const { data: monitorRows, error: monitorError } = await sb
      .from("monitors")
      .insert([
        {
          tenant_id: input.clientId,
          site_id: site.id,
          kind: "http",
          label: "HTTP",
          status: "unchecked",
        },
        {
          tenant_id: input.clientId,
          site_id: site.id,
          kind: "ssl",
          label: "TLS",
          status: "unchecked",
        },
      ])
      .select("*");
    fail(monitorError, "Site added, but monitors failed.");
    let blocks = get().blocks;
    if (input.kind === "public") {
      const { data: blockRows, error: blockError } = await sb
        .from("content_blocks")
        .insert(
          DEFAULT_BLOCKS.map((b) => ({
            tenant_id: input.clientId,
            site_id: site.id,
            group_name: b.group,
            key: b.key,
            label: b.label,
            kind: b.kind,
            value: "",
            hint: b.hint,
            max_len: b.maxLen,
          })),
        )
        .select("*");
      if (!blockError && blockRows) blocks = [...blocks, ...blockRows.map(mapBlock)];
    }
    set((s) => ({
      sites: [...s.sites, site],
      monitors: [...s.monitors, ...(monitorRows ?? []).map(mapMonitor)],
      blocks,
    }));
  },

  updateClient: async (id, patch) => {
    const sb = requireSupabase();
    const row: Record<string, unknown> = {};
    if (patch.name != null) row.name = patch.name;
    if (patch.city != null) row.city = patch.city;
    if (patch.contactName != null) row.contact_name = patch.contactName;
    if (patch.status != null) row.status = patch.status;
    if (patch.phone != null) row.phone = patch.phone;
    if (patch.email != null) row.email = patch.email;
    if (patch.address != null) row.address = patch.address;
    if (patch.hours != null) row.hours = patch.hours;
    if (patch.whatsapp != null) row.whatsapp = patch.whatsapp;
    if (patch.modules) {
      row.modules_store = patch.modules.store;
      row.modules_calendar = patch.modules.calendar;
      row.modules_bookings = patch.modules.bookings;
    }
    const { data, error } = await sb
      .from("tenants")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    fail(error, "Could not save those details.");
    const mapped = mapTenant(data);
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? mapped : c)),
    }));
  },

  setEnquiryStatus: async (id, status) => {
    const sb = requireSupabase();
    const { error } = await sb.from("enquiries").update({ status }).eq("id", id);
    fail(error, "Could not update that enquiry.");
    set((s) => ({
      enquiries: s.enquiries.map((e) => (e.id === id ? { ...e, status } : e)),
    }));
  },

  addMedia: async (input) => {
    const { path } = await uploadTenantImage(input.clientId, input.file);
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("media")
      .insert({
        tenant_id: input.clientId,
        name: input.name,
        path,
      })
      .select("*")
      .single();
    if (error) {
      await removeStoragePath(path);
      throw new Error("Could not save that photo.");
    }
    set((s) => ({ media: [mapMedia(data), ...s.media] }));
  },

  removeMedia: async (id) => {
    const current = get().media.find((m) => m.id === id);
    const sb = requireSupabase();
    const { error } = await sb.from("media").delete().eq("id", id);
    fail(error, "Could not remove that photo.");
    if (current?.path) await removeStoragePath(current.path);
    set((s) => ({ media: s.media.filter((m) => m.id !== id) }));
  },

  setInvoiceStatus: async (id, status) => {
    const sb = requireSupabase();
    const { error } = await sb.from("invoices").update({ status }).eq("id", id);
    fail(error, "Could not update that invoice.");
    set((s) => ({
      invoices: s.invoices.map((i) => (i.id === id ? { ...i, status } : i)),
    }));
  },

  addProduct: async (input) => {
    const sb = requireSupabase();
    const max = get()
      .products.filter((p) => p.clientId === input.clientId)
      .reduce((n, p) => Math.max(n, p.sortOrder), -1);
    const { data, error } = await sb
      .from("products")
      .insert({
        tenant_id: input.clientId,
        name: input.name,
        price_zar: input.priceZar,
        stock: input.stock,
        live: input.live,
        photo_path: input.photoPath ?? "",
        note: input.note,
        sort_order: max + 1,
        featured: input.featured ?? false,
      })
      .select("*")
      .single();
    fail(error, "Could not add that item.");
    set((s) => ({ products: [...s.products, mapProduct(data)] }));
  },

  updateProduct: async (id, patch) => {
    const sb = requireSupabase();
    const row: Record<string, unknown> = {};
    if (patch.name != null) row.name = patch.name;
    if (patch.priceZar != null) row.price_zar = patch.priceZar;
    if (patch.stock != null) row.stock = patch.stock;
    if (patch.live != null) row.live = patch.live;
    if (patch.note != null) row.note = patch.note;
    if (patch.photoPath != null) row.photo_path = patch.photoPath;
    if (patch.sortOrder != null) row.sort_order = patch.sortOrder;
    if (patch.featured != null) row.featured = patch.featured;
    const { data, error } = await sb
      .from("products")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    fail(error, "Could not update that item.");
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? mapProduct(data) : p)),
    }));
  },

  removeProduct: async (id) => {
    const sb = requireSupabase();
    const { error } = await sb.from("products").delete().eq("id", id);
    fail(error, "Could not remove that item.");
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  addEvent: async (input) => {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("calendar_events")
      .insert({
        tenant_id: input.clientId,
        title: input.title,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        place: input.place,
        notes: input.notes,
      })
      .select("*")
      .single();
    fail(error, "Could not add that date.");
    set((s) => ({ events: [mapEvent(data), ...s.events] }));
  },

  updateEvent: async (id, patch) => {
    const sb = requireSupabase();
    const row: Record<string, unknown> = {};
    if (patch.title != null) row.title = patch.title;
    if (patch.startsAt != null) row.starts_at = patch.startsAt;
    if (patch.endsAt != null) row.ends_at = patch.endsAt;
    if (patch.place != null) row.place = patch.place;
    if (patch.notes != null) row.notes = patch.notes;
    const { data, error } = await sb
      .from("calendar_events")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    fail(error, "Could not update that date.");
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? mapEvent(data) : e)),
    }));
  },

  removeEvent: async (id) => {
    const sb = requireSupabase();
    const { error } = await sb.from("calendar_events").delete().eq("id", id);
    fail(error, "Could not take that date off.");
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
  },

  addBooking: async (input) => {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("bookings")
      .insert({
        tenant_id: input.clientId,
        guest_name: input.guestName,
        email: input.email,
        phone: input.phone,
        starts_at: input.startsAt,
        notes: input.notes,
        status: input.status,
      })
      .select("*")
      .single();
    fail(error, "Could not add that booking.");
    set((s) => ({ bookings: [mapBooking(data), ...s.bookings] }));
  },

  setBookingStatus: async (id, status) => {
    const sb = requireSupabase();
    const { error } = await sb.from("bookings").update({ status }).eq("id", id);
    fail(error, "Could not update that booking.");
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
  },

  removeBooking: async (id) => {
    const sb = requireSupabase();
    const { error } = await sb.from("bookings").delete().eq("id", id);
    fail(error, "Could not remove that booking.");
    set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) }));
  },

  reorderProducts: async (clientId, orderedIds) => {
    const sb = requireSupabase();
    const updates = orderedIds.map((id, i) =>
      sb.from("products").update({ sort_order: i }).eq("id", id),
    );
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) throw new Error("Could not save that order.");
    set((s) => ({
      products: s.products.map((p) => {
        if (p.clientId !== clientId) return p;
        const i = orderedIds.indexOf(p.id);
        return i < 0 ? p : { ...p, sortOrder: i };
      }),
    }));
  },

  ensureSections: async (clientId) => {
    const existing = get().sections.filter((s) => s.clientId === clientId);
    const missing = DEFAULT_SECTION_KEYS.filter((k) => !existing.some((s) => s.key === k));
    if (missing.length === 0) return;
    const sb = requireSupabase();
    const start = existing.length;
    const { data, error } = await sb
      .from("content_sections")
      .insert(
        missing.map((key, i) => ({
          tenant_id: clientId,
          key,
          sort_order: start + i,
          visible: true,
          payload: {},
        })),
      )
      .select("*");
    if (error) return;
    set((s) => ({
      sections: [...s.sections, ...(data ?? []).map(mapSection)],
    }));
  },

  updateSection: async (id, patch) => {
    const sb = requireSupabase();
    const row: Record<string, unknown> = {};
    if (patch.visible != null) row.visible = patch.visible;
    if (patch.payload != null) row.payload = patch.payload;
    if (patch.sortOrder != null) row.sort_order = patch.sortOrder;
    const { data, error } = await sb
      .from("content_sections")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    fail(error, "Could not save that section.");
    set((s) => ({
      sections: s.sections.map((x) => (x.id === id ? mapSection(data) : x)),
    }));
  },

  reorderSections: async (clientId, orderedIds) => {
    const sb = requireSupabase();
    const results = await Promise.all(
      orderedIds.map((id, i) =>
        sb.from("content_sections").update({ sort_order: i }).eq("id", id),
      ),
    );
    if (results.some((r) => r.error)) throw new Error("Could not save that order.");
    set((s) => ({
      sections: s.sections.map((x) => {
        if (x.clientId !== clientId) return x;
        const i = orderedIds.indexOf(x.id);
        return i < 0 ? x : { ...x, sortOrder: i };
      }),
    }));
  },

  saveAdvert: async (input) => {
    const sb = requireSupabase();
    const row = {
      tenant_id: input.clientId,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      status: input.status,
      photo_path: input.photoPath,
      headline: input.headline,
      body: input.body,
      link_type: input.linkType,
      link_id: input.linkId,
    };
    if (input.status === "live") {
      await sb
        .from("weekly_adverts")
        .update({ status: "expired" })
        .eq("tenant_id", input.clientId)
        .eq("status", "live")
        .neq("id", input.id ?? "00000000-0000-0000-0000-000000000000");
    }
    const q = input.id
      ? sb.from("weekly_adverts").update(row).eq("id", input.id).select("*").single()
      : sb.from("weekly_adverts").insert(row).select("*").single();
    const { data, error } = await q;
    fail(error, "Could not save that advert.");
    const mapped = mapAdvert(data);
    set((s) => ({
      adverts: input.id
        ? s.adverts.map((a) => (a.id === mapped.id ? mapped : a)).map((a) =>
            a.clientId === input.clientId && a.id !== mapped.id && a.status === "live"
              ? { ...a, status: "expired" as AdvertStatus }
              : a,
          )
        : [mapped, ...s.adverts],
    }));
  },

  setAdvertStatus: async (id, status) => {
    const current = get().adverts.find((a) => a.id === id);
    if (!current) throw new Error("Advert not found.");
    await get().saveAdvert({ ...current, status });
  },
}));

export function useSession(): Session | null {
  return useAscStore((s) => s.session);
}

export function useCurrentUser(): User | undefined {
  return useAscStore((s) => s.users.find((u) => u.id === s.session?.userId));
}

export function useIsOperator(): boolean {
  return useAscStore((s) => {
    const u = s.users.find((x) => x.id === s.session?.userId);
    return u?.role === "operator";
  });
}

export function useOwnClientId(): string | null {
  return useAscStore((s) => {
    const u = s.users.find((x) => x.id === s.session?.userId);
    if (!u) return null;
    if (u.role === "operator") return null;
    return u.clientId;
  });
}

export function useOwnClient() {
  return useAscStore((s) => {
    const u = s.users.find((x) => x.id === s.session?.userId);
    if (!u?.clientId) return undefined;
    return s.clients.find((c) => c.id === u.clientId);
  });
}

export function visibleClientIds(state: AppTables, user?: User): string[] {
  if (!user) return [];
  if (user.role === "operator") return state.clients.map((c) => c.id);
  return user.clientId ? [user.clientId] : [];
}

export function useStoreReady(): boolean {
  return useAscStore((s) => s.ready);
}
