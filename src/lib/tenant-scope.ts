import type { AppTables, Site, User } from "@/lib/types";

export function canAccessTenant(user: User | undefined, tenantId: string): boolean {
  if (!user) return false;
  if (user.role === "operator") return true;
  return Boolean(tenantId) && user.clientId === tenantId;
}

export function assertCanAccessTenant(user: User | undefined, tenantId: string): void {
  if (!canAccessTenant(user, tenantId)) {
    throw new Error("That does not belong to your account.");
  }
}

export function assertOperator(user: User | undefined): void {
  if (user?.role !== "operator") {
    throw new Error("Staff only.");
  }
}

function pickTables(tables: AppTables): AppTables {
  return {
    users: tables.users,
    clients: tables.clients,
    sites: tables.sites,
    monitors: tables.monitors,
    incidents: tables.incidents,
    renewals: tables.renewals,
    visitors: tables.visitors,
    requests: tables.requests,
    blocks: tables.blocks,
    log: tables.log,
    enquiries: tables.enquiries,
    media: tables.media,
    invoices: tables.invoices,
    products: tables.products,
    events: tables.events,
    bookings: tables.bookings,
    sections: tables.sections,
    adverts: tables.adverts,
    siteRedesigns: tables.siteRedesigns,
  };
}

export function dropSiteFromTables(tables: AppTables, siteId: string): AppTables {
  const next = pickTables(tables);
  return {
    ...next,
    sites: next.sites.filter((site) => site.id !== siteId),
    monitors: next.monitors.filter((row) => row.siteId !== siteId),
    incidents: next.incidents.filter((row) => row.siteId !== siteId),
    visitors: next.visitors.filter((row) => row.siteId !== siteId),
    blocks: next.blocks.filter((row) => row.siteId !== siteId),
    sections: next.sections.filter((row) => row.siteId !== siteId),
    adverts: next.adverts.filter((row) => row.siteId !== siteId),
    products: next.products.filter((row) => row.siteId !== siteId),
    events: next.events.filter((row) => row.siteId !== siteId),
    bookings: next.bookings.filter((row) => row.siteId !== siteId),
    enquiries: next.enquiries.filter((row) => row.siteId !== siteId),
    siteRedesigns: next.siteRedesigns.filter((row) => row.siteId !== siteId),
  };
}

export function dropClientFromTables(tables: AppTables, tenantId: string): AppTables {
  const next = pickTables(tables);
  const siteIds = new Set(
    next.sites.filter((site) => site.clientId === tenantId).map((site) => site.id),
  );
  return {
    users: next.users.filter((user) => user.clientId !== tenantId),
    clients: next.clients.filter((client) => client.id !== tenantId),
    sites: next.sites.filter((site) => site.clientId !== tenantId),
    monitors: next.monitors.filter((row) => !siteIds.has(row.siteId)),
    incidents: next.incidents.filter((row) => !siteIds.has(row.siteId)),
    visitors: next.visitors.filter((row) => !siteIds.has(row.siteId)),
    blocks: next.blocks.filter((row) => !siteIds.has(row.siteId)),
    renewals: next.renewals.filter((row) => row.clientId !== tenantId),
    requests: next.requests.filter((row) => row.clientId !== tenantId),
    log: next.log.filter((row) => row.clientId !== tenantId),
    enquiries: next.enquiries.filter((row) => row.clientId !== tenantId),
    media: next.media.filter((row) => row.clientId !== tenantId),
    invoices: next.invoices.filter((row) => row.clientId !== tenantId),
    products: next.products.filter((row) => row.clientId !== tenantId),
    events: next.events.filter((row) => row.clientId !== tenantId),
    bookings: next.bookings.filter((row) => row.clientId !== tenantId),
    sections: next.sections.filter((row) => row.clientId !== tenantId),
    adverts: next.adverts.filter((row) => row.clientId !== tenantId),
    siteRedesigns: next.siteRedesigns.filter((row) => row.clientId !== tenantId),
  };
}

export function ownSwitchableSites(sites: Site[], tenantId: string | null): Site[] {
  if (!tenantId) return [];
  const own = sites.filter((site) => site.clientId === tenantId);
  const pub = own.filter((site) => site.kind === "public");
  return pub.length > 0 ? pub : own;
}

export function resolveActiveSiteId(
  sites: Site[],
  tenantId: string | null,
  preferred: string | null | undefined,
): string | null {
  const own = ownSwitchableSites(sites, tenantId);
  if (preferred && own.some((site) => site.id === preferred)) return preferred;
  return own[0]?.id ?? null;
}

export function scopeTablesToTenant(tables: AppTables, tenantId: string): AppTables {
  const siteIds = new Set(
    tables.sites.filter((site) => site.clientId === tenantId).map((site) => site.id),
  );

  return {
    users: tables.users.filter((user) => user.clientId === tenantId),
    clients: tables.clients.filter((client) => client.id === tenantId),
    sites: tables.sites.filter((site) => site.clientId === tenantId),
    monitors: tables.monitors.filter((monitor) => siteIds.has(monitor.siteId)),
    incidents: tables.incidents.filter((incident) => siteIds.has(incident.siteId)),
    visitors: tables.visitors.filter((visitor) => siteIds.has(visitor.siteId)),
    blocks: tables.blocks.filter((block) => siteIds.has(block.siteId)),
    renewals: tables.renewals.filter((item) => item.clientId === tenantId),
    requests: tables.requests.filter((request) => request.clientId === tenantId),
    log: tables.log.filter((entry) => entry.clientId === tenantId),
    enquiries: tables.enquiries.filter((enquiry) => enquiry.clientId === tenantId),
    media: tables.media.filter((media) => media.clientId === tenantId),
    invoices: tables.invoices.filter((invoice) => invoice.clientId === tenantId),
    products: tables.products.filter((product) => product.clientId === tenantId),
    events: tables.events.filter((event) => event.clientId === tenantId),
    bookings: tables.bookings.filter((booking) => booking.clientId === tenantId),
    sections: tables.sections.filter((section) => section.clientId === tenantId),
    adverts: tables.adverts.filter((advert) => advert.clientId === tenantId),
    siteRedesigns: tables.siteRedesigns.filter((row) => row.clientId === tenantId),
  };
}
