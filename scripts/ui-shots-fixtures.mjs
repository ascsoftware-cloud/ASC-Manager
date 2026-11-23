/**
 * Fake workspace data for scripts/ui-shots.mjs. Everything here is invented and
 * never leaves the machine: the screenshot script answers the browser's
 * Supabase requests itself, so no real login or database is touched.
 */

const DAY = 86_400_000;
const now = Date.now();
const iso = (offsetDays, hours = 9) => {
  const d = new Date(now + offsetDays * DAY);
  d.setUTCHours(hours, 0, 0, 0);
  return d.toISOString();
};
const day = (offsetDays) => iso(offsetDays).slice(0, 10);

const ID = {
  op1: "00000000-0000-4000-8000-000000000a01",
  op2: "00000000-0000-4000-8000-000000000a02",
  cu1: "00000000-0000-4000-8000-000000000c01",
  cu2: "00000000-0000-4000-8000-000000000c02",
  cu3: "00000000-0000-4000-8000-000000000c03",
  cu5: "00000000-0000-4000-8000-000000000c05",
  t1: "00000000-0000-4000-8000-0000000000b1",
  t2: "00000000-0000-4000-8000-0000000000b2",
  t3: "00000000-0000-4000-8000-0000000000b3",
  t4: "00000000-0000-4000-8000-0000000000b4",
  t5: "00000000-0000-4000-8000-0000000000b5",
  s1: "00000000-0000-4000-8000-0000000000d1",
  s2: "00000000-0000-4000-8000-0000000000d2",
  s3: "00000000-0000-4000-8000-0000000000d3",
  s4: "00000000-0000-4000-8000-0000000000d4",
};

const mod = (on) => ({
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
  ...Object.fromEntries(on.map((k) => [`modules_${k}`, true])),
});

const tenants = [
  { id: ID.t1, name: "Bosveld Plumbing", city: "Pretoria", contact_name: "Annelie Botha", status: "active", phone: "012 555 0141", email: "office@bosveld.example", address: "14 Church Street, Pretoria", hours: "Mon-Fri 07:30-17:00", whatsapp: "", ...mod(["gallery", "services", "seo", "faq"]) },
  { id: ID.t2, name: "Kloof View Guest House", city: "Hartbeespoort", contact_name: "Sipho Dlamini", status: "active", phone: "012 555 0188", email: "stay@kloofview.example", address: "2 Kloof Road, Hartbeespoort", hours: "Daily 08:00-20:00", whatsapp: "", ...mod(["store", "calendar", "bookings", "gallery", "services", "seo"]) },
  { id: ID.t3, name: "Tshwane Auto Spares", city: "Pretoria", contact_name: "Willem Pretorius", status: "active", phone: "012 555 0102", email: "sales@tshwaneauto.example", address: "88 Lynnwood Road, Pretoria", hours: "Mon-Sat 07:00-17:00", whatsapp: "", ...mod(["store", "services"]) },
  { id: ID.t4, name: "Collage Gemeenskapskerk", city: "Pretoria", contact_name: "Office", status: "paused", phone: "", email: "", address: "", hours: "", whatsapp: "", ...mod(["advert", "staff", "calendar"]) },
  { id: ID.t5, name: "Mokoena Bakery", city: "Centurion", contact_name: "Lerato Mokoena", status: "active", phone: "", email: "", address: "", hours: "", whatsapp: "", ...mod([]) },
];

const profiles = [
  { user_id: ID.op1, email: "gregory@staff.example", name: "Gregory Candiotes", role: "operator", tenant_id: null, access: "admin", permissions: [], site_ids: [] },
  { user_id: ID.op2, email: "tiaan@staff.example", name: "Tiaan Schoeman", role: "operator", tenant_id: null, access: "admin", permissions: [], site_ids: [] },
  { user_id: ID.cu1, email: "sipho@kloofview.example", name: "Sipho Dlamini", role: "client", tenant_id: ID.t2, access: "admin", permissions: [], site_ids: [] },
  { user_id: ID.cu2, email: "nandi@kloofview.example", name: "Nandi Khumalo", role: "client", tenant_id: ID.t2, access: "staff", permissions: ["enquiries", "bookings"], site_ids: [] },
  { user_id: ID.cu3, email: "annelie@bosveld.example", name: "Annelie Botha", role: "client", tenant_id: ID.t1, access: "admin", permissions: [], site_ids: [] },
  { user_id: ID.cu5, email: "lerato@mokoena.example", name: "Lerato Mokoena", role: "client", tenant_id: ID.t5, access: "admin", permissions: [], site_ids: [] },
];

const sites = [
  { id: ID.s1, tenant_id: ID.t2, name: "Kloof View Guest House", host: "kloofview.example", url: "https://kloofview.example", kind: "public" },
  { id: ID.s2, tenant_id: ID.t1, name: "Bosveld Plumbing", host: "bosveld.example", url: "https://bosveld.example", kind: "public" },
  { id: ID.s3, tenant_id: ID.t3, name: "Tshwane Auto Spares", host: "tshwaneauto.example", url: "https://tshwaneauto.example", kind: "public" },
  { id: ID.s4, tenant_id: ID.t4, name: "Collage Gemeenskapskerk", host: "collage.example", url: "https://collage.example", kind: "public" },
];

const monitors = [
  { id: "m1", site_id: ID.s1, kind: "http", label: "Homepage", status: "up", last_checked_at: iso(0, 6), uptime30: 99.98 },
  { id: "m2", site_id: ID.s1, kind: "ssl", label: "Certificate", status: "up", last_checked_at: iso(0, 6), uptime30: 100 },
  { id: "m3", site_id: ID.s2, kind: "http", label: "Homepage", status: "down", last_checked_at: iso(0, 7), uptime30: 97.2 },
  { id: "m4", site_id: ID.s3, kind: "http", label: "Homepage", status: "up", last_checked_at: iso(0, 6), uptime30: 99.9 },
  { id: "m5", site_id: ID.s4, kind: "http", label: "Homepage", status: "unchecked", last_checked_at: null, uptime30: null },
];

const incidents = [
  { id: "i1", site_id: ID.s2, title: "Homepage not responding", status: "open", opened_at: iso(0, 7) },
  { id: "i2", site_id: ID.s3, title: "Slow responses over 4 seconds", status: "resolved", opened_at: iso(-6, 10) },
];

const renewals = [
  { id: "r1", tenant_id: ID.t1, item: "bosveld.example", type: "domain", expires_at: day(12) },
  { id: "r2", tenant_id: ID.t2, item: "kloofview.example", type: "domain", expires_at: day(21) },
  { id: "r3", tenant_id: ID.t3, item: "Hosting plan", type: "hosting", expires_at: day(48) },
  { id: "r4", tenant_id: ID.t2, item: "Certificate", type: "ssl", expires_at: day(90) },
];

const visitors = Array.from({ length: 14 }, (_, i) => ({
  site_id: ID.s1,
  date: day(-13 + i),
  views: 40 + ((i * 17) % 55),
  bots: 6 + (i % 5),
}));

const requests = [
  { id: "q1", tenant_id: ID.t2, title: "Swap the homepage photo", body: "We renovated the dining room and want new pictures up before the long weekend.", status: "open", created_at: iso(-1, 14), author_name: "Sipho Dlamini" },
  { id: "q2", tenant_id: ID.t1, title: "Add a 24-hour call-out number", body: "Please add it to the header.", status: "open", created_at: iso(-3, 9), author_name: "Annelie Botha" },
  { id: "q3", tenant_id: ID.t2, title: "Fix typo on About page", body: "", status: "done", created_at: iso(-9, 11), author_name: "Sipho Dlamini" },
];

const enquiries = [
  { id: "e1", tenant_id: ID.t2, site_id: ID.s1, name: "Johan Venter", email: "johan@example.com", phone: "082 555 0100", message: "Do you have a room free the weekend of the 14th? Two adults and a dog.", status: "new", created_at: iso(0, 8) },
  { id: "e2", tenant_id: ID.t2, site_id: ID.s1, name: "Thandi Mokoena", email: "thandi@example.com", phone: "", message: "Is breakfast included?", status: "read", created_at: iso(-2, 15) },
];

const products = [
  { id: "p1", tenant_id: ID.t2, site_id: ID.s1, name: "Gift voucher R500", price_zar: 500, stock: 20, live: true, photo_path: "", note: "", sort_order: 0, featured: false },
  { id: "p2", tenant_id: ID.t2, site_id: ID.s1, name: "Breakfast hamper", price_zar: 350, stock: 0, live: true, photo_path: "", note: "", sort_order: 1, featured: false },
];

const invoices = [
  { id: "v1", tenant_id: ID.t2, ref: "INV-0042", item: "Hosting, annual", amount_zar: 2400, status: "due", due_at: day(7) },
  { id: "v2", tenant_id: ID.t2, ref: "INV-0031", item: "Site build", amount_zar: 9500, status: "paid", due_at: day(-60) },
];

const log = [
  { id: "l1", tenant_id: ID.t2, summary: "Updated the welcome line", at: iso(-1, 13), actor: "Sipho Dlamini" },
  { id: "l2", tenant_id: ID.t2, summary: "Added 3 photos to the gallery", at: iso(-4, 16), actor: "Nandi Khumalo" },
];

const sections = [
  { id: "c1", tenant_id: ID.t2, site_id: ID.s1, key: "welcome", sort_order: 0, visible: true, payload: { line: "Quiet rooms with a view of the dam" }, updated_at: iso(-1) },
];

const empty = [];

export const tables = {
  profiles,
  tenants,
  sites,
  monitors,
  incidents,
  renewals,
  visitor_days: visitors,
  requests,
  content_blocks: empty,
  products,
  calendar_events: empty,
  bookings: empty,
  content_sections: sections,
  weekly_adverts: empty,
  site_redesigns: empty,
  enquiries,
  media: empty,
  invoices,
  change_log: log,
};

/** Which of the fake people each persona signs in as, and which tenant rows they can see. */
export const personas = {
  staff: { userId: ID.op1, tenantId: null },
  client: { userId: ID.cu1, tenantId: ID.t2 },
  "client-new": { userId: ID.cu5, tenantId: ID.t5 },
};

export const staffAccounts = [
  { userId: ID.op1, email: "gregory@staff.example", name: "Gregory Candiotes", status: "active", lastSignInAt: iso(0, 7) },
  { userId: ID.op2, email: "tiaan@staff.example", name: "Tiaan Schoeman", status: "active", lastSignInAt: iso(-2, 16) },
  { userId: "00000000-0000-4000-8000-000000000a03", email: "newhire@staff.example", name: "Zanele Nkosi", status: "invited", lastSignInAt: null },
];

export function tablesFor(persona) {
  const p = personas[persona];
  if (!p || !p.tenantId) return tables;
  const t = p.tenantId;
  const own = (rows) => rows.filter((r) => !r.tenant_id || r.tenant_id === t);
  const ownSites = tables.sites.filter((s) => s.tenant_id === t);
  const siteIds = new Set(ownSites.map((s) => s.id));
  return {
    ...tables,
    profiles: tables.profiles.filter((r) => r.tenant_id === t),
    tenants: tables.tenants.filter((r) => r.id === t),
    sites: ownSites,
    monitors: tables.monitors.filter((m) => siteIds.has(m.site_id)),
    incidents: [],
    renewals: own(tables.renewals),
    visitor_days: tables.visitor_days.filter((v) => siteIds.has(v.site_id)),
    requests: own(tables.requests),
    products: own(tables.products),
    enquiries: own(tables.enquiries),
    invoices: own(tables.invoices),
    change_log: own(tables.change_log),
    content_sections: own(tables.content_sections),
  };
}
