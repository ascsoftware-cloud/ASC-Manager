import type {
  AdvertLinkType,
  AdvertStatus,
  Booking,
  BookingStatus,
  CalendarEvent,
  ChangeLog,
  Client,
  ContentBlock,
  ContentSection,
  Enquiry,
  Incident,
  Invoice,
  MediaAsset,
  Monitor,
  Product,
  Renewal,
  SectionKey,
  Site,
  SiteRedesign,
  WeeklyAdvert,
  SupportRequest,
  User,
  VisitorDay,
} from "@/lib/types";
import { publicMediaUrl } from "./storage";

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v !== "") return Number(v);
  return fallback;
}

function bool(v: unknown): boolean {
  return v === true;
}

export function mapUser(row: Row): User {
  return {
    id: str(row.user_id),
    email: str(row.email),
    name: str(row.name),
    role: row.role === "operator" ? "operator" : "client",
    clientId: row.tenant_id ? str(row.tenant_id) : null,
  };
}

export function mapTenant(row: Row): Client {
  return {
    id: str(row.id),
    name: str(row.name),
    city: str(row.city),
    contactName: str(row.contact_name),
    status: row.status === "paused" ? "paused" : "active",
    phone: str(row.phone),
    email: str(row.email),
    address: str(row.address),
    hours: str(row.hours),
    whatsapp: str(row.whatsapp),
    modules: {
      store: bool(row.modules_store),
      calendar: bool(row.modules_calendar),
      bookings: bool(row.modules_bookings),
      advert: bool(row.modules_advert),
    },
  };
}

export function mapSite(row: Row): Site {
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    name: str(row.name),
    host: str(row.host),
    url: str(row.url),
    kind: row.kind === "admin" ? "admin" : "public",
  };
}

export function mapSiteRedesign(row: Row): SiteRedesign {
  return {
    id: str(row.id),
    siteId: str(row.site_id),
    clientId: str(row.tenant_id),
    redesignUrl: str(row.redesign_url),
    notes: str(row.notes),
    updatedAt: str(row.updated_at),
  };
}

export function mapMonitor(row: Row): Monitor {
  return {
    id: str(row.id),
    siteId: str(row.site_id),
    kind: row.kind === "ssl" ? "ssl" : "http",
    label: str(row.label),
    status:
      row.status === "up" ? "up" : row.status === "down" ? "down" : "unchecked",
    lastCheckedAt: row.last_checked_at ? str(row.last_checked_at) : null,
    uptime30: row.uptime30 == null ? null : num(row.uptime30),
  };
}

export function mapIncident(row: Row): Incident {
  return {
    id: str(row.id),
    siteId: str(row.site_id),
    title: str(row.title),
    status: row.status === "resolved" ? "resolved" : "open",
    openedAt: str(row.opened_at),
  };
}

export function mapRenewal(row: Row): Renewal {
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    item: str(row.item),
    type: row.type === "hosting" || row.type === "ssl" ? row.type : "domain",
    expiresAt: str(row.expires_at),
  };
}

export function mapVisitor(row: Row): VisitorDay {
  return {
    siteId: str(row.site_id),
    date: str(row.date).slice(0, 10),
    views: num(row.views),
    bots: num(row.bots),
  };
}

export function mapRequest(row: Row): SupportRequest {
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    title: str(row.title),
    body: str(row.body),
    status: row.status === "done" ? "done" : "open",
    createdAt: str(row.created_at),
    authorName: str(row.author_name),
  };
}

export function mapBlock(row: Row): ContentBlock {
  const raw = str(row.value);
  return {
    id: str(row.id),
    siteId: str(row.site_id),
    group: str(row.group_name),
    key: str(row.key),
    label: str(row.label),
    kind: row.kind === "image" || row.kind === "url" ? row.kind : "text",
    value: row.kind === "image" ? publicMediaUrl(raw) || raw : raw,
    hint: str(row.hint),
    maxLen: num(row.max_len),
    updatedAt: str(row.updated_at),
  };
}

export function mapProduct(row: Row): Product {
  const path = str(row.photo_path);
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    name: str(row.name),
    priceZar: num(row.price_zar),
    stock: num(row.stock),
    live: bool(row.live),
    photo: publicMediaUrl(path),
    photoPath: path,
    note: str(row.note),
    sortOrder: num(row.sort_order),
    featured: bool(row.featured),
  };
}

const SECTION_KEYS: SectionKey[] = [
  "welcome",
  "this_week",
  "this_sunday",
  "featured",
  "hours",
  "seo",
  "faq",
  "testimonials",
  "gallery",
  "services",
  "staff",
];

export function mapSection(row: Row): ContentSection {
  const key = SECTION_KEYS.includes(row.key as SectionKey)
    ? (row.key as SectionKey)
    : "welcome";
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    siteId: str(row.site_id),
    key,
    sortOrder: num(row.sort_order),
    visible: row.visible !== false,
    payload,
    updatedAt: str(row.updated_at),
  };
}

export function mapAdvert(row: Row): WeeklyAdvert {
  const status = row.status;
  const st: AdvertStatus =
    status === "scheduled" || status === "live" || status === "expired"
      ? status
      : "draft";
  const link = row.link_type;
  const linkType: AdvertLinkType =
    link === "product" || link === "event" || link === "url" ? link : "none";
  const path = str(row.photo_path);
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    siteId: str(row.site_id),
    startsOn: str(row.starts_on).slice(0, 10),
    endsOn: str(row.ends_on).slice(0, 10),
    status: st,
    photoPath: path,
    photoUrl: publicMediaUrl(path),
    headline: str(row.headline),
    body: str(row.body),
    linkType,
    linkId: str(row.link_id),
    updatedAt: str(row.updated_at),
  };
}

export function mapBooking(row: Row): Booking {
  const status = row.status;
  const ok: BookingStatus =
    status === "confirmed" || status === "cancelled" ? status : "requested";
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    guestName: str(row.guest_name),
    email: str(row.email),
    phone: str(row.phone),
    startsAt: str(row.starts_at),
    notes: str(row.notes),
    status: ok,
  };
}

export function mapEvent(row: Row): CalendarEvent {
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    title: str(row.title),
    startsAt: str(row.starts_at),
    endsAt: str(row.ends_at),
    place: str(row.place),
    notes: str(row.notes),
  };
}

export function mapEnquiry(row: Row): Enquiry {
  const status = row.status;
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    name: str(row.name),
    email: str(row.email),
    phone: str(row.phone),
    message: str(row.message),
    status: status === "read" || status === "done" ? status : "new",
    createdAt: str(row.created_at),
  };
}

export function mapMedia(row: Row): MediaAsset {
  const path = str(row.path);
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    name: str(row.name),
    path,
    url: publicMediaUrl(path),
    addedAt: str(row.added_at),
  };
}

export function mapInvoice(row: Row): Invoice {
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    ref: str(row.ref),
    item: str(row.item),
    amountZar: num(row.amount_zar),
    status: row.status === "paid" ? "paid" : "due",
    dueAt: str(row.due_at),
  };
}

export function mapLog(row: Row): ChangeLog {
  return {
    id: str(row.id),
    clientId: str(row.tenant_id),
    summary: str(row.summary),
    at: str(row.at),
    actor: str(row.actor),
  };
}
