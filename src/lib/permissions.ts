import type { Client, User } from "@/lib/types";

/**
 * What a client login can be allowed to see. An account admin sees all of it;
 * a staff login sees only the pages an admin ticked for them.
 */
export const PERMISSION_KEYS = [
  "content",
  "store",
  "calendar",
  "bookings",
  "enquiries",
  "visitors",
  "business",
  "billing",
  "requests",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type Access = "admin" | "staff";

export const PERMISSIONS: ReadonlyArray<{
  key: PermissionKey;
  label: string;
  detail: string;
  /** Only offered when ASC switched this module on for the account. */
  module?: keyof Client["modules"];
}> = [
  { key: "content", label: "Website", detail: "Edit the pages and extras on the public site." },
  { key: "store", label: "Store", detail: "Products, prices and stock.", module: "store" },
  { key: "calendar", label: "Calendar", detail: "Dates, camps and closed days.", module: "calendar" },
  { key: "bookings", label: "Bookings", detail: "Reservations and slots.", module: "bookings" },
  { key: "enquiries", label: "Enquiries", detail: "Messages from the site form." },
  { key: "visitors", label: "Visitors", detail: "Page-view numbers." },
  { key: "business", label: "Business details", detail: "Hours, phone and address." },
  { key: "billing", label: "Billing", detail: "Invoices and renewals." },
  { key: "requests", label: "Ask ASC", detail: "Send and follow requests to ASC." },
];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

/** Drops anything that is not a real permission and removes duplicates. */
export function cleanPermissions(list: readonly string[]): PermissionKey[] {
  return [...new Set(list)].filter(isPermissionKey);
}

export function isAccountAdmin(user: User | undefined): boolean {
  return user?.role === "client" && user.access === "admin";
}

/** May this login open the page behind `key`? ASC staff always may. */
export function canUse(user: User | undefined, key: PermissionKey): boolean {
  if (!user) return false;
  if (user.role === "operator") return true;
  if (user.access === "admin") return true;
  return user.permissions.includes(key);
}

/** May this login add, edit, remove and reset the passwords of its team? */
export function canManageTeam(user: User | undefined): boolean {
  return isAccountAdmin(user);
}

/** "All pages" / "Store, Calendar" — for the team list. */
export function describeAccess(
  member: Pick<User, "access" | "permissions" | "siteIds">,
  totalSites: number,
): string {
  if (member.access === "admin") return "Everything, and manages the team";
  const labels = PERMISSIONS.filter((p) => member.permissions.includes(p.key)).map(
    (p) => p.label,
  );
  const pages = labels.length === 0 ? "No pages yet" : labels.join(", ");
  if (totalSites > 1) {
    const sites =
      member.siteIds.length === 0 || member.siteIds.length >= totalSites
        ? "all sites"
        : `${member.siteIds.length} of ${totalSites} sites`;
    return `${pages} · ${sites}`;
  }
  return pages;
}
