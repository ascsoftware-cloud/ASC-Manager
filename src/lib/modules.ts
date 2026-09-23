import type { Client, SectionKey } from "@/lib/types";

export type DeskModuleKey = "store" | "calendar" | "bookings" | "advert";
export type WebsiteModuleKey =
  | "seo"
  | "faq"
  | "testimonials"
  | "gallery"
  | "services"
  | "staff";
export type ModuleKey = DeskModuleKey | WebsiteModuleKey;

export const EMPTY_MODULES: Client["modules"] = {
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
};

export const DESK_MODULE_TOGGLES: ReadonlyArray<{
  key: DeskModuleKey;
  label: string;
  title?: string;
}> = [
  { key: "store", label: "Store" },
  { key: "calendar", label: "Calendar" },
  { key: "bookings", label: "Bookings" },
  {
    key: "advert",
    label: "Site media",
    title: "Pictures they put on the public site. Only if we built that on their homepage.",
  },
];

export const WEBSITE_MODULE_TOGGLES: ReadonlyArray<{
  key: WebsiteModuleKey;
  label: string;
  title?: string;
}> = [
  { key: "gallery", label: "Gallery" },
  { key: "services", label: "Services", title: "Services and pricing on the public site." },
  { key: "staff", label: "Staff" },
  { key: "testimonials", label: "Testimonials" },
  { key: "faq", label: "FAQ" },
  { key: "seo", label: "SEO", title: "Page title, meta description, social preview." },
];

const SECTION_MODULE: Partial<Record<SectionKey, ModuleKey>> = {
  this_week: "advert",
  seo: "seo",
  faq: "faq",
  testimonials: "testimonials",
  gallery: "gallery",
  services: "services",
  staff: "staff",
};

export function sectionEnabled(
  client: Pick<Client, "modules"> | undefined,
  key: SectionKey,
): boolean {
  if (key === "this_sunday") return false;
  const mod = SECTION_MODULE[key];
  if (!mod) return true;
  if (!client) return false;
  return Boolean(client.modules[mod]);
}
