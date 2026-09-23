import { startTransition } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { inviteUserFn } from "@/lib/invite";
import { removeTenantFn } from "@/lib/remove-tenant";
import { authCallbackUrl } from "@/lib/auth/email-callback";
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
  mapSiteRedesign,
  mapTenant,
  mapUser,
  mapVisitor,
} from "@/lib/supabase/map";
import { removeStoragePath, uploadTenantImage } from "@/lib/supabase/storage";
import {
  assertCanAccessTenant,
  assertOperator,
  dropClientFromTables,
  dropSiteFromTables,
  ownSwitchableSites,
  resolveActiveSiteId,
  scopeTablesToTenant,
} from "@/lib/tenant-scope";
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
  Role,
  Session,
  Site,
  User,
  WeeklyAdvert,
} from "@/lib/types";

const COOKIE_KEY = "asc-cookies-v1";
const SHELL_KEY = "asc-shell-v1";

type ShellHint = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  clientId: string | null;
  activeSiteId?: string | null;
};

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
    group: "Site pictures",
    key: "advert_image",
    label: "Site picture",
    kind: "image",
    hint: "JPG, PNG, WEBP or GIF, up to 4 MB.",
    maxLen: 0,
  },
  {
    group: "Site pictures",
    key: "advert_link",
    label: "Picture links to",
    kind: "url",
    hint: "Full address including https://",
    maxLen: 240,
  },
  {
    group: "Site pictures",
    key: "advert_caption",
    label: "Picture caption",
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
    siteRedesigns: [],
  };
}

const DEFAULT_SECTION_KEYS: SectionKey[] = [
  "welcome",
  "this_week",
  "featured",
  "hours",
  "seo",
  "faq",
  "testimonials",
  "gallery",
  "services",
  "staff",
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

function readShellHint(): ShellHint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SHELL_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ShellHint;
    if (!v?.userId || (v.role !== "operator" && v.role !== "client")) return null;
    return v;
  } catch {
    return null;
  }
}

function writeShellHint(user: User, activeSiteId?: string | null): void {
  if (typeof window === "undefined") return;
  const hint: ShellHint = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId,
    activeSiteId: activeSiteId ?? null,
  };
  window.sessionStorage.setItem(SHELL_KEY, JSON.stringify(hint));
}

function clearShellHint(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SHELL_KEY);
}

function userFromHint(hint: ShellHint): User {
  return {
    id: hint.userId,
    email: hint.email,
    name: hint.name,
    role: hint.role,
    clientId: hint.clientId,
  };
}

function userFromAuth(
  userId: string,
  email: string,
  meta: Record<string, unknown> | undefined,
): User | null {
  const role = meta?.role;
  if (role !== "operator" && role !== "client") return null;
  const tenant = meta?.tenant_id;
  return {
    id: userId,
    email,
    name: typeof meta?.name === "string" && meta.name ? meta.name : email,
    role,
    clientId: typeof tenant === "string" && tenant ? tenant : null,
  };
}

function mergeUser(users: User[], user: User): User[] {
  return [user, ...users.filter((u) => u.id !== user.id)];
}

function patchById<T extends { id: string }>(rows: T[], id: string, patch: Partial<T>): T[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
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
    siteRedesigns,
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
    sb.from("site_redesigns").select("*"),
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
    siteRedesigns: siteRedesigns.error
      ? []
      : (siteRedesigns.data ?? []).map(mapSiteRedesign),
    enquiries: (enquiries.data ?? []).map(mapEnquiry),
    media: (media.data ?? []).map(mapMedia),
    invoices: (invoices.data ?? []).map(mapInvoice),
    log: (log.data ?? []).map(mapLog),
  };
}

async function loadUsers(): Promise<User[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("profiles").select("*");
  fail(error, "Invite sent, but the user list could not refresh.");
  return (data ?? []).map(mapUser);
}

function sessionUser(get: () => AscStore): User {
  const state = get();
  const user = state.users.find((row) => row.id === state.session?.userId);
  if (!user) throw new Error("Signed out.");
  return user;
}

function assertTenantWrite(get: () => AscStore, tenantId: string): void {
  assertCanAccessTenant(sessionUser(get), tenantId);
}

function assertStaff(get: () => AscStore): void {
  assertOperator(sessionUser(get));
}

function pickActiveSiteId(
  get: () => AscStore,
  sites: Site[],
  current: string | null,
): string | null {
  const user = get().users.find((row) => row.id === get().session?.userId);
  if (user?.role === "client") {
    return resolveActiveSiteId(sites, user.clientId, current);
  }
  if (current && sites.some((site) => site.id === current)) return current;
  return null;
}

function assertSiteWrite(get: () => AscStore, siteId: string): Site {
  if (!siteId) throw new Error("Pick a public site first.");
  const site = get().sites.find((row) => row.id === siteId);
  if (!site) throw new Error("Site not found.");
  assertTenantWrite(get, site.clientId);
  return site;
}

type AscStore = AppTables & {
  ready: boolean;
  hydrating: boolean;
  loadError: string | null;
  session: Session | null;
  cookiesAccepted: boolean | null;
  activeSiteId: string | null;
  setActiveSite: (siteId: string) => void;
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
  removeSite: (id: string) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  saveSiteRedesign: (
    siteId: string,
    input: { redesignUrl: string; notes: string },
  ) => Promise<void>;
  updateClient: (id: string, patch: Partial<Client>) => Promise<void>;
  setEnquiryStatus: (id: string, status: EnquiryStatus) => Promise<void>;
  addMedia: (input: {
    clientId: string;
    name: string;
    file: File;
  }) => Promise<{ path: string }>;
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
  reorderProducts: (siteId: string, orderedIds: string[]) => Promise<void>;
  ensureSections: (clientId: string, siteId: string) => Promise<void>;
  updateSection: (
    id: string,
    patch: Partial<Pick<ContentSection, "visible" | "payload" | "sortOrder">>,
  ) => Promise<void>;
  reorderSections: (siteId: string, orderedIds: string[]) => Promise<void>;
  saveAdvert: (
    input: Omit<WeeklyAdvert, "id" | "photoUrl" | "updatedAt"> & { id?: string },
  ) => Promise<void>;
  setAdvertStatus: (id: string, status: AdvertStatus) => Promise<void>;
  removeAdvert: (id: string) => Promise<void>;
};

let listening = false;
let bootstrapped = false;
let hydrateLock: Promise<void> | null = null;
let hydrateSeq = 0;

function bumpHydrate(): void {
  hydrateSeq += 1;
  hydrateLock = null;
}

function signedOutState(cookiesAccepted: boolean | null): Partial<AscStore> {
  return {
    ...emptyTables(),
    session: null,
    ready: true,
    hydrating: false,
    loadError: null,
    cookiesAccepted,
    activeSiteId: null,
  };
}

export const useAscStore = create<AscStore>()((set, get) => ({
  ...emptyTables(),
  ready: false,
  hydrating: false,
  loadError: null,
  session: null,
  cookiesAccepted: null,
  activeSiteId: null,

  setActiveSite: (siteId) => {
    const user = get().users.find((row) => row.id === get().session?.userId);
    if (!user) return;
    const next =
      user.role === "client"
        ? resolveActiveSiteId(get().sites, user.clientId, siteId)
        : get().sites.some((site) => site.id === siteId)
          ? siteId
          : get().activeSiteId;
    if (!next || next === get().activeSiteId) return;
    writeShellHint(user, next);
    set({ activeSiteId: next });
  },

  bootstrap: async () => {
    set({ cookiesAccepted: readCookies() });
    const sb = getSupabase();
    if (sb && !listening) {
      listening = true;
      sb.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          bumpHydrate();
          clearShellHint();
          set(signedOutState(get().cookiesAccepted));
          return;
        }
        if (event === "SIGNED_IN") {
          void get().hydrateFromSession();
        }
      });
    }
    if (bootstrapped) {
      if (hydrateLock) await hydrateLock;
      return;
    }
    bootstrapped = true;
    await get().hydrateFromSession();
  },

  hydrateFromSession: async () => {
    if (hydrateLock) return hydrateLock;
    const run = (async () => {
      const seq = ++hydrateSeq;
      const cookiesAccepted = get().cookiesAccepted;
      if (!isSupabaseConfigured() || !getSupabase()) {
        set(signedOutState(cookiesAccepted));
        return;
      }
      const sb = requireSupabase();
      const { data: sessionData } = await sb.auth.getSession();
      if (seq !== hydrateSeq) return;
      const session = sessionData.session;
      if (!session?.user) {
        clearShellHint();
        set(signedOutState(cookiesAccepted));
        return;
      }

      const hint = readShellHint();
      const seeded =
        hint && hint.userId === session.user.id
          ? userFromHint(hint)
          : userFromAuth(
              session.user.id,
              session.user.email ?? "",
              session.user.user_metadata as Record<string, unknown> | undefined,
            );
      set({
        session: { userId: session.user.id },
        ready: true,
        hydrating: true,
        loadError: null,
        cookiesAccepted,
        users: seeded ? mergeUser(get().users, seeded) : get().users,
      });

      const tablesPromise = loadTables();
      const { data: profile, error: profileError } = await sb
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (seq !== hydrateSeq) return;

      if (profileError) {
        set({
          ready: true,
          hydrating: false,
          session: { userId: session.user.id },
          loadError: "Could not load your profile. Check the database grants.",
          cookiesAccepted,
        });
        return;
      }
      if (!profile) {
        set({
          ready: true,
          hydrating: false,
          session: { userId: session.user.id },
          loadError: "This account has no profile. Ask ASC to invite you.",
          cookiesAccepted,
        });
        return;
      }

      const mappedProfile = mapUser(profile);
      const preferredSiteId =
        hint && hint.userId === session.user.id
          ? (hint.activeSiteId ?? get().activeSiteId)
          : get().activeSiteId;
      writeShellHint(mappedProfile, preferredSiteId);
      set({
        users: mergeUser(get().users, mappedProfile),
        ready: true,
        hydrating: true,
        loadError: null,
        session: { userId: session.user.id },
        cookiesAccepted,
      });

      try {
        const tables = await tablesPromise;
        if (seq !== hydrateSeq) return;
        const scopedTables =
          mappedProfile.role === "client" && mappedProfile.clientId
            ? scopeTablesToTenant(tables, mappedProfile.clientId)
            : tables;
        const activeSiteId =
          mappedProfile.role === "client"
            ? resolveActiveSiteId(
                scopedTables.sites,
                mappedProfile.clientId,
                preferredSiteId,
              )
            : preferredSiteId &&
                scopedTables.sites.some((site) => site.id === preferredSiteId)
              ? preferredSiteId
              : null;
        writeShellHint(mappedProfile, activeSiteId);
        startTransition(() => {
          if (seq !== hydrateSeq) return;
          set({
            ...scopedTables,
            users: mergeUser(scopedTables.users, mappedProfile),
            ready: true,
            hydrating: false,
            loadError: null,
            session: { userId: session.user.id },
            cookiesAccepted: get().cookiesAccepted,
            activeSiteId,
          });
        });
      } catch (e) {
        if (seq !== hydrateSeq) return;
        set({
          ready: true,
          hydrating: false,
          loadError: e instanceof Error ? e.message : "Could not load your workspace.",
          session: { userId: session.user.id },
        });
      }
    })();
    hydrateLock = run;
    void run.finally(() => {
      if (hydrateLock === run) hydrateLock = null;
    });
    return run;
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
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) return { ok: false, error: "That email or password is wrong." };
    const seeded = userFromAuth(
      data.user.id,
      data.user.email ?? email.trim(),
      data.user.user_metadata as Record<string, unknown> | undefined,
    );
    set({
      session: { userId: data.user.id },
      ready: true,
      hydrating: true,
      loadError: null,
      ...(seeded ? { users: mergeUser(get().users, seeded) } : {}),
    });
    void get().hydrateFromSession();
    return { ok: true };
  },

  signOut: async () => {
    bumpHydrate();
    clearShellHint();
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    set(signedOutState(get().cookiesAccepted));
  },

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured()) return;
    const sb = requireSupabase();
    await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authCallbackUrl(),
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
    set({ users: await loadUsers() });
  },

  runChecks: async (siteId) => {
    const sb = requireSupabase();
    const now = new Date().toISOString();
    const prev = get().monitors;
    set({
      monitors: prev.map((m) =>
        m.siteId === siteId
          ? {
              ...m,
              status: "up" as MonitorStatus,
              lastCheckedAt: now,
              uptime30: m.uptime30 ?? 100,
            }
          : m,
      ),
    });
    const { error } = await sb
      .from("monitors")
      .update({ status: "up", last_checked_at: now })
      .eq("site_id", siteId);
    if (error) {
      set({ monitors: prev });
      throw new Error("Could not write those checks.");
    }
  },

  updateBlock: async (id, value, actor) => {
    const block = get().blocks.find((b) => b.id === id);
    if (block) assertSiteWrite(get, block.siteId);
    const sb = requireSupabase();
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
    const site = assertSiteWrite(get, block.siteId);
    const { path } = await uploadTenantImage(site.clientId, file);
    await get().updateBlock(id, path, actor);
  },

  addBlock: async (input, actor) => {
    const site = assertSiteWrite(get, input.siteId);
    const sb = requireSupabase();
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
    assertTenantWrite(get, input.clientId);
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
    const current = get().requests.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const prev = get().requests;
    set({ requests: patchById(prev, id, { status }) });
    const { error } = await sb.from("requests").update({ status }).eq("id", id);
    if (error) {
      set({ requests: prev });
      throw new Error("Could not update that request.");
    }
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
        modules_advert: false,
        modules_seo: false,
        modules_faq: false,
        modules_testimonials: false,
        modules_gallery: false,
        modules_services: false,
        modules_staff: false,
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
    assertTenantWrite(get, input.clientId);
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
    const firstPublic =
      input.kind === "public" &&
      !get().sites.some(
        (row) => row.clientId === input.clientId && row.kind === "public",
      );
    const user = get().users.find((row) => row.id === get().session?.userId);
    if (user?.role === "client" && !get().activeSiteId && site.kind === "public") {
      writeShellHint(user, site.id);
      set({ activeSiteId: site.id });
    }
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
    let products = get().products;
    let events = get().events;
    let bookings = get().bookings;
    let enquiries = get().enquiries;
    if (firstPublic) {
      const moved = await Promise.all([
        sb.from("products").update({ site_id: site.id }).eq("tenant_id", input.clientId).is("site_id", null).select("*"),
        sb.from("calendar_events").update({ site_id: site.id }).eq("tenant_id", input.clientId).is("site_id", null).select("*"),
        sb.from("bookings").update({ site_id: site.id }).eq("tenant_id", input.clientId).is("site_id", null).select("*"),
        sb.from("enquiries").update({ site_id: site.id }).eq("tenant_id", input.clientId).is("site_id", null).select("*"),
      ]);
      if (!moved[0].error && moved[0].data) {
        const mapped = moved[0].data.map(mapProduct);
        const ids = new Set(mapped.map((p) => p.id));
        products = [...products.filter((p) => !ids.has(p.id)), ...mapped];
      }
      if (!moved[1].error && moved[1].data) {
        const mapped = moved[1].data.map(mapEvent);
        const ids = new Set(mapped.map((p) => p.id));
        events = [...events.filter((p) => !ids.has(p.id)), ...mapped];
      }
      if (!moved[2].error && moved[2].data) {
        const mapped = moved[2].data.map(mapBooking);
        const ids = new Set(mapped.map((p) => p.id));
        bookings = [...bookings.filter((p) => !ids.has(p.id)), ...mapped];
      }
      if (!moved[3].error && moved[3].data) {
        const mapped = moved[3].data.map(mapEnquiry);
        const ids = new Set(mapped.map((p) => p.id));
        enquiries = [...enquiries.filter((p) => !ids.has(p.id)), ...mapped];
      }
    }
    set((s) => ({
      sites: [...s.sites, site],
      monitors: [...s.monitors, ...(monitorRows ?? []).map(mapMonitor)],
      blocks,
      products,
      events,
      bookings,
      enquiries,
    }));
  },

  removeSite: async (id) => {
    assertStaff(get);
    const site = get().sites.find((row) => row.id === id);
    if (!site) throw new Error("Site not found.");
    const sb = requireSupabase();
    const { error } = await sb.from("sites").delete().eq("id", id);
    fail(error, "Could not remove that site.");
    const tables = dropSiteFromTables(get(), id);
    const user = get().users.find((row) => row.id === get().session?.userId);
    const activeSiteId = pickActiveSiteId(get, tables.sites, get().activeSiteId);
    if (user) writeShellHint(user, activeSiteId);
    set({ ...tables, activeSiteId });
  },

  removeClient: async (id) => {
    assertStaff(get);
    const client = get().clients.find((row) => row.id === id);
    if (!client) throw new Error("Client not found.");
    await removeTenantFn({
      data: {
        accessToken: await accessToken(),
        tenantId: id,
      },
    });
    const tables = dropClientFromTables(get(), id);
    const user = get().users.find((row) => row.id === get().session?.userId);
    const activeSiteId = pickActiveSiteId(get, tables.sites, get().activeSiteId);
    if (user) writeShellHint(user, activeSiteId);
    set({ ...tables, activeSiteId });
  },

  saveSiteRedesign: async (siteId, input) => {
    const sb = requireSupabase();
    const site = get().sites.find((x) => x.id === siteId);
    if (!site) throw new Error("Site not found.");
    const { data, error } = await sb
      .from("site_redesigns")
      .upsert(
        {
          site_id: siteId,
          tenant_id: site.clientId,
          redesign_url: input.redesignUrl.trim(),
          notes: input.notes.trim(),
        },
        { onConflict: "site_id" },
      )
      .select("*")
      .single();
    fail(error, "Could not save the redesign link.");
    const mapped = mapSiteRedesign(data);
    set((s) => ({
      siteRedesigns: [
        ...s.siteRedesigns.filter((r) => r.siteId !== siteId),
        mapped,
      ],
    }));
  },

  updateClient: async (id, patch) => {
    assertTenantWrite(get, id);
    const sb = requireSupabase();
    const prev = get().clients;
    const current = prev.find((c) => c.id === id);
    if (current) {
      set({
        clients: prev.map((c) =>
          c.id === id
            ? { ...c, ...patch, modules: patch.modules ?? c.modules }
            : c,
        ),
      });
    }
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
      row.modules_advert = patch.modules.advert;
      row.modules_seo = patch.modules.seo;
      row.modules_faq = patch.modules.faq;
      row.modules_testimonials = patch.modules.testimonials;
      row.modules_gallery = patch.modules.gallery;
      row.modules_services = patch.modules.services;
      row.modules_staff = patch.modules.staff;
    }
    const { data, error } = await sb
      .from("tenants")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      set({ clients: prev });
      throw new Error("Could not save those details.");
    }
    const mapped = mapTenant(data);
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? mapped : c)),
    }));
  },

  setEnquiryStatus: async (id, status) => {
    const current = get().enquiries.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const prev = get().enquiries;
    set({ enquiries: patchById(prev, id, { status }) });
    const { error } = await sb.from("enquiries").update({ status }).eq("id", id);
    if (error) {
      set({ enquiries: prev });
      throw new Error("Could not update that enquiry.");
    }
  },

  addMedia: async (input) => {
    assertTenantWrite(get, input.clientId);
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
    return { path };
  },

  removeMedia: async (id) => {
    const current = get().media.find((m) => m.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const { error } = await sb.from("media").delete().eq("id", id);
    fail(error, "Could not remove that photo.");
    if (current?.path) await removeStoragePath(current.path);
    set((s) => ({ media: s.media.filter((m) => m.id !== id) }));
  },

  setInvoiceStatus: async (id, status) => {
    const sb = requireSupabase();
    const prev = get().invoices;
    set({ invoices: patchById(prev, id, { status }) });
    const { error } = await sb.from("invoices").update({ status }).eq("id", id);
    if (error) {
      set({ invoices: prev });
      throw new Error("Could not update that invoice.");
    }
  },

  addProduct: async (input) => {
    assertTenantWrite(get, input.clientId);
    assertSiteWrite(get, input.siteId);
    const sb = requireSupabase();
    const max = get()
      .products.filter((p) => p.siteId === input.siteId)
      .reduce((n, p) => Math.max(n, p.sortOrder), -1);
    const { data, error } = await sb
      .from("products")
      .insert({
        tenant_id: input.clientId,
        site_id: input.siteId,
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
    const current = get().products.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
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
    const current = get().products.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const { error } = await sb.from("products").delete().eq("id", id);
    fail(error, "Could not remove that item.");
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  addEvent: async (input) => {
    assertTenantWrite(get, input.clientId);
    assertSiteWrite(get, input.siteId);
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("calendar_events")
      .insert({
        tenant_id: input.clientId,
        site_id: input.siteId,
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
    const current = get().events.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
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
    const current = get().events.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const { error } = await sb.from("calendar_events").delete().eq("id", id);
    fail(error, "Could not take that date off.");
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
  },

  addBooking: async (input) => {
    assertTenantWrite(get, input.clientId);
    assertSiteWrite(get, input.siteId);
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("bookings")
      .insert({
        tenant_id: input.clientId,
        site_id: input.siteId,
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
    const current = get().bookings.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const prev = get().bookings;
    set({ bookings: patchById(prev, id, { status }) });
    const { error } = await sb.from("bookings").update({ status }).eq("id", id);
    if (error) {
      set({ bookings: prev });
      throw new Error("Could not update that booking.");
    }
  },

  removeBooking: async (id) => {
    const current = get().bookings.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const { error } = await sb.from("bookings").delete().eq("id", id);
    fail(error, "Could not remove that booking.");
    set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) }));
  },

  reorderProducts: async (siteId, orderedIds) => {
    assertSiteWrite(get, siteId);
    const sb = requireSupabase();
    const prev = get().products;
    set({
      products: prev.map((p) => {
        if (p.siteId !== siteId) return p;
        const i = orderedIds.indexOf(p.id);
        return i < 0 ? p : { ...p, sortOrder: i };
      }),
    });
    const results = await Promise.all(
      orderedIds.map((id, i) => sb.from("products").update({ sort_order: i }).eq("id", id)),
    );
    if (results.some((r) => r.error)) {
      set({ products: prev });
      throw new Error("Could not save that order.");
    }
  },

  ensureSections: async (clientId, siteId) => {
    assertTenantWrite(get, clientId);
    assertSiteWrite(get, siteId);
    const existing = get().sections.filter((s) => s.clientId === clientId && s.siteId === siteId);
    const missing = DEFAULT_SECTION_KEYS.filter((k) => !existing.some((s) => s.key === k));
    if (missing.length === 0) return;
    const sb = requireSupabase();
    const start = existing.length;
    const { data, error } = await sb
      .from("content_sections")
      .insert(
        missing.map((key, i) => ({
          tenant_id: clientId,
          site_id: siteId,
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
    const current = get().sections.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const prev = get().sections;
    set({
      sections: prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
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
    if (error) {
      set({ sections: prev });
      throw new Error("Could not save that section.");
    }
    set((s) => ({
      sections: s.sections.map((x) => (x.id === id ? mapSection(data) : x)),
    }));
  },

  reorderSections: async (siteId, orderedIds) => {
    assertSiteWrite(get, siteId);
    const sb = requireSupabase();
    const prev = get().sections;
    set({
      sections: prev.map((x) => {
        if (x.siteId !== siteId) return x;
        const i = orderedIds.indexOf(x.id);
        return i < 0 ? x : { ...x, sortOrder: i };
      }),
    });
    const results = await Promise.all(
      orderedIds.map((id, i) =>
        sb.from("content_sections").update({ sort_order: i }).eq("id", id),
      ),
    );
    if (results.some((r) => r.error)) {
      set({ sections: prev });
      throw new Error("Could not save that order.");
    }
  },

  saveAdvert: async (input) => {
    assertTenantWrite(get, input.clientId);
    assertSiteWrite(get, input.siteId);
    const sb = requireSupabase();
    const row = {
      tenant_id: input.clientId,
      site_id: input.siteId,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      status: input.status,
      photo_path: input.photoPath,
      headline: input.headline,
      body: input.body,
      link_type: input.linkType,
      link_id: input.linkId,
    };
    const q = input.id
      ? sb.from("weekly_adverts").update(row).eq("id", input.id).select("*").single()
      : sb.from("weekly_adverts").insert(row).select("*").single();
    const { data, error } = await q;
    fail(error, "Could not save that picture.");
    const mapped = mapAdvert(data);
    set((s) => ({
      adverts: input.id
        ? s.adverts.map((a) => (a.id === mapped.id ? mapped : a))
        : [mapped, ...s.adverts],
    }));
  },

  setAdvertStatus: async (id, status) => {
    const current = get().adverts.find((a) => a.id === id);
    if (!current) throw new Error("Picture not found.");
    const prev = get().adverts;
    set({ adverts: patchById(prev, id, { status }) });
    try {
      await get().saveAdvert({ ...current, status });
    } catch (e) {
      set({ adverts: prev });
      throw e;
    }
  },

  removeAdvert: async (id) => {
    const current = get().adverts.find((row) => row.id === id);
    assertTenantWrite(get, current?.clientId ?? "");
    const sb = requireSupabase();
    const { error } = await sb.from("weekly_adverts").delete().eq("id", id);
    fail(error, "Could not remove that picture.");
    set((s) => ({ adverts: s.adverts.filter((a) => a.id !== id) }));
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

const NO_SITES: Site[] = [];

export function useOwnSites() {
  return useAscStore(
    useShallow((s) => {
      const u = s.users.find((x) => x.id === s.session?.userId);
      if (!u?.clientId) return NO_SITES;
      return ownSwitchableSites(s.sites, u.clientId);
    }),
  );
}

export function useActiveSite() {
  return useAscStore((s) => {
    const u = s.users.find((x) => x.id === s.session?.userId);
    if (!u) return undefined;
    const tenantId = u.role === "client" ? u.clientId : s.sites.find((site) => site.id === s.activeSiteId)?.clientId ?? null;
    const id = resolveActiveSiteId(s.sites, tenantId, s.activeSiteId);
    return s.sites.find((site) => site.id === id);
  });
}

export function visibleClientIds(state: Pick<AppTables, "clients">, user?: User): string[] {
  if (!user) return [];
  if (user.role === "operator") return state.clients.map((c) => c.id);
  return user.clientId ? [user.clientId] : [];
}

export function useStoreReady(): boolean {
  return useAscStore((s) => s.ready);
}

export function useHydrating(): boolean {
  return useAscStore((s) => s.hydrating);
}

if (typeof window !== "undefined") {
  queueMicrotask(() => {
    void useAscStore.getState().bootstrap();
  });
}
