import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertCanAccessTenant,
  assertOperator,
  canAccessTenant,
  dropClientFromTables,
  dropSiteFromTables,
  ownSwitchableSites,
  resolveActiveSiteId,
  scopeTablesToTenant,
} from "./tenant-scope.ts";
import type { AppTables, Site, User } from "./types.ts";

const operator: User = {
  id: "op",
  email: "tiaan@ascsoftware.co.za",
  name: "Tiaan",
  role: "operator",
  clientId: null,
};

const demo: User = {
  id: "demo",
  email: "demo.client@example.com",
  name: "Demo shop",
  role: "client",
  clientId: "tenant-demo",
};

const other: User = {
  id: "other",
  email: "other@example.com",
  name: "Other",
  role: "client",
  clientId: "tenant-other",
};

function site(id: string, clientId: string, kind: Site["kind"] = "public"): Site {
  return { id, clientId, name: id, host: `${id}.example.com`, url: `https://${id}.example.com`, kind };
}

function emptyTables(): AppTables {
  return {
    users: [demo, other, operator],
    clients: [
      {
        id: "tenant-demo",
        name: "Demo Shop",
        city: "Pretoria",
        contactName: "Demo",
        status: "active",
        phone: "",
        email: demo.email,
        address: "",
        hours: "",
        whatsapp: "",
        modules: {
          store: true,
          calendar: true,
          bookings: true,
          advert: true,
          seo: true,
          faq: true,
          testimonials: false,
          gallery: false,
          services: false,
          staff: false,
        },
      },
      {
        id: "tenant-other",
        name: "Other Co",
        city: "Pretoria",
        contactName: "Other",
        status: "active",
        phone: "",
        email: other.email,
        address: "",
        hours: "",
        whatsapp: "",
        modules: {
          store: false,
          calendar: false,
          bookings: false,
          advert: false,
          seo: false,
          faq: false,
          testimonials: false,
          gallery: false,
          services: false,
          staff: false,
        },
      },
    ],
    sites: [
      site("demo-a", "tenant-demo"),
      site("demo-b", "tenant-demo"),
      site("other-a", "tenant-other"),
    ],
    monitors: [{ id: "m1", siteId: "other-a", kind: "http", label: "HTTP", status: "up", lastCheckedAt: null, uptime30: 100 }],
    incidents: [{ id: "i1", siteId: "other-a", title: "Outage", status: "open", openedAt: "2026-01-01" }],
    renewals: [{ id: "r1", clientId: "tenant-other", item: "Domain", type: "domain", expiresAt: "2027-01-01" }],
    visitors: [{ siteId: "other-a", date: "2026-01-01", views: 9, bots: 1 }],
    requests: [{ id: "q1", clientId: "tenant-other", title: "Help", body: "", status: "open", createdAt: "2026-01-01", authorName: "X" }],
    blocks: [{ id: "b1", siteId: "other-a", group: "Home", key: "welcome", label: "Welcome", kind: "text", value: "secret", hint: "", maxLen: 80, updatedAt: "2026-01-01" }],
    log: [{ id: "l1", clientId: "tenant-other", summary: "secret", at: "2026-01-01", actor: "X" }],
    enquiries: [{ id: "e1", clientId: "tenant-other", siteId: "other-a", name: "A", email: "a@b.c", phone: "", message: "hi", status: "new", createdAt: "2026-01-01" }],
    media: [{ id: "md1", clientId: "tenant-other", name: "pic", path: "x", url: "x", addedAt: "2026-01-01" }],
    invoices: [{ id: "inv1", clientId: "tenant-other", ref: "1", item: "Host", amountZar: 1, status: "due", dueAt: "2026-01-01" }],
    products: [{ id: "p1", clientId: "tenant-other", siteId: "other-a", name: "Hoodie", priceZar: 1, stock: 1, live: true, photo: "", photoPath: "", note: "", sortOrder: 0, featured: false }],
    events: [{ id: "ev1", clientId: "tenant-other", siteId: "other-a", title: "Secret", startsAt: "2026-01-01", endsAt: "2026-01-01", place: "", notes: "" }],
    bookings: [{ id: "bk1", clientId: "tenant-other", siteId: "other-a", guestName: "A", email: "a@b.c", phone: "", startsAt: "2026-01-01", notes: "", status: "requested" }],
    sections: [{ id: "s1", clientId: "tenant-other", siteId: "other-a", key: "welcome", sortOrder: 0, visible: true, payload: { line: "secret" }, updatedAt: "2026-01-01" }],
    adverts: [{ id: "ad1", clientId: "tenant-other", siteId: "other-a", startsOn: "2026-01-01", endsOn: "2026-01-02", status: "live", photoPath: "", photoUrl: "", headline: "secret", body: "", linkType: "none", linkId: "", updatedAt: "2026-01-01" }],
    siteRedesigns: [{ id: "rd1", siteId: "other-a", clientId: "tenant-other", redesignUrl: "https://secret.example", notes: "private", updatedAt: "2026-01-01" }],
  };
}

describe("tenant isolation", () => {
  it("lets operators through and keeps a client on their own tenant", () => {
    assert.equal(canAccessTenant(operator, "tenant-other"), true);
    assert.equal(canAccessTenant(demo, "tenant-demo"), true);
    assert.equal(canAccessTenant(demo, "tenant-other"), false);
    assert.equal(canAccessTenant(undefined, "tenant-demo"), false);
    assert.throws(() => assertCanAccessTenant(demo, "tenant-other"), /does not belong/);
  });

  it("strips every other tenant's rows, including redesigns", () => {
    const scoped = scopeTablesToTenant(emptyTables(), "tenant-demo");
    assert.deepEqual(scoped.clients.map((c) => c.id), ["tenant-demo"]);
    assert.deepEqual(scoped.users.map((u) => u.id), ["demo"]);
    assert.deepEqual(scoped.sites.map((s) => s.id).sort(), ["demo-a", "demo-b"]);
    assert.equal(scoped.products.length, 0);
    assert.equal(scoped.enquiries.length, 0);
    assert.equal(scoped.sections.length, 0);
    assert.equal(scoped.adverts.length, 0);
    assert.equal(scoped.siteRedesigns.length, 0);
    assert.equal(scoped.blocks.length, 0);
    assert.equal(scoped.invoices.length, 0);
  });

  it("lets staff through and blocks client logins from staff-only work", () => {
    assertOperator(operator);
    assert.throws(() => assertOperator(demo), /Staff only/);
    assert.throws(() => assertOperator(undefined), /Staff only/);
  });

  it("drops one site and the rows that hang off it", () => {
    const next = dropSiteFromTables(emptyTables(), "other-a");
    assert.equal(next.sites.some((s) => s.id === "other-a"), false);
    assert.equal(next.sites.some((s) => s.id === "demo-a"), true);
    assert.equal(next.monitors.length, 0);
    assert.equal(next.incidents.length, 0);
    assert.equal(next.blocks.length, 0);
    assert.equal(next.siteRedesigns.length, 0);
    assert.equal(next.clients.length, 2);
    assert.equal(next.products.length, 0);
    assert.equal(next.events.length, 0);
    assert.equal(next.bookings.length, 0);
    assert.equal(next.enquiries.length, 0);
  });

  it("drops a client, their logins, sites, and content", () => {
    const next = dropClientFromTables(emptyTables(), "tenant-other");
    assert.deepEqual(next.clients.map((c) => c.id), ["tenant-demo"]);
    assert.deepEqual(next.users.map((u) => u.id).sort(), ["demo", "op"]);
    assert.deepEqual(next.sites.map((s) => s.id).sort(), ["demo-a", "demo-b"]);
    assert.equal(next.products.length, 0);
    assert.equal(next.enquiries.length, 0);
    assert.equal(next.siteRedesigns.length, 0);
    assert.equal(next.monitors.length, 0);
  });

  it("does not copy extra keys off the store", () => {
    const dirty = { ...emptyTables(), hydrate: true } as AppTables & { hydrate: boolean };
    const droppedSite = dropSiteFromTables(dirty, "other-a");
    const droppedClient = dropClientFromTables(dirty, "tenant-other");
    assert.equal("hydrate" in droppedSite, false);
    assert.equal("hydrate" in droppedClient, false);
  });
});

describe("site switching", () => {
  it("prefers public sites and keeps a valid selection", () => {
    const sites = [
      site("admin-1", "tenant-demo", "admin"),
      site("demo-a", "tenant-demo"),
      site("demo-b", "tenant-demo"),
      site("other-a", "tenant-other"),
    ];
    assert.deepEqual(
      ownSwitchableSites(sites, "tenant-demo").map((s) => s.id),
      ["demo-a", "demo-b"],
    );
    assert.equal(resolveActiveSiteId(sites, "tenant-demo", "demo-b"), "demo-b");
    assert.equal(resolveActiveSiteId(sites, "tenant-demo", "other-a"), "demo-a");
    assert.equal(resolveActiveSiteId(sites, "tenant-demo", null), "demo-a");
    assert.equal(resolveActiveSiteId(sites, "tenant-missing", "demo-a"), null);
  });
});
