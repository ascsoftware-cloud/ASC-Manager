export type Role = "operator" | "client";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  clientId: string | null;
};

export type Client = {
  id: string;
  name: string;
  city: string;
  contactName: string;
  status: "active" | "paused";
  phone: string;
  email: string;
  address: string;
  hours: string;
  whatsapp: string;
  modules: {
    store: boolean;
    calendar: boolean;
    bookings: boolean;
    advert: boolean;
  };
};

export type Product = {
  id: string;
  clientId: string;
  name: string;
  priceZar: number;
  stock: number;
  live: boolean;
  photo: string;
  photoPath: string;
  note: string;
  sortOrder: number;
  featured: boolean;
};

export type CalendarEvent = {
  id: string;
  clientId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  place: string;
  notes: string;
};

export type BookingStatus = "requested" | "confirmed" | "cancelled";

export type Booking = {
  id: string;
  clientId: string;
  guestName: string;
  email: string;
  phone: string;
  startsAt: string;
  notes: string;
  status: BookingStatus;
};

export type EnquiryStatus = "new" | "read" | "done";

export type Enquiry = {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
};

export type MediaAsset = {
  id: string;
  clientId: string;
  name: string;
  path: string;
  url: string;
  addedAt: string;
};

export type InvoiceStatus = "due" | "paid";

export type Invoice = {
  id: string;
  clientId: string;
  ref: string;
  item: string;
  amountZar: number;
  status: InvoiceStatus;
  dueAt: string;
};

export type Site = {
  id: string;
  clientId: string;
  name: string;
  host: string;
  url: string;
  kind: "public" | "admin";
};

export type MonitorStatus = "up" | "down" | "unchecked";

export type Monitor = {
  id: string;
  siteId: string;
  kind: "http" | "ssl";
  label: string;
  status: MonitorStatus;
  lastCheckedAt: string | null;
  uptime30: number | null;
};

export type Incident = {
  id: string;
  siteId: string;
  title: string;
  status: "open" | "resolved";
  openedAt: string;
};

export type Renewal = {
  id: string;
  clientId: string;
  item: string;
  type: "domain" | "hosting" | "ssl";
  expiresAt: string;
};

export type VisitorDay = {
  siteId: string;
  date: string;
  views: number;
  bots: number;
};

export type RequestStatus = "open" | "done";

export type SupportRequest = {
  id: string;
  clientId: string;
  title: string;
  body: string;
  status: RequestStatus;
  createdAt: string;
  authorName: string;
};

export type SectionKey =
  | "welcome"
  | "this_week"
  | "this_sunday"
  | "featured"
  | "hours";

export type ContentSection = {
  id: string;
  clientId: string;
  key: SectionKey;
  sortOrder: number;
  visible: boolean;
  payload: Record<string, unknown>;
  updatedAt: string;
};

export type AdvertStatus = "draft" | "scheduled" | "live" | "expired";
export type AdvertLinkType = "none" | "product" | "event" | "url";

export type WeeklyAdvert = {
  id: string;
  clientId: string;
  startsOn: string;
  endsOn: string;
  status: AdvertStatus;
  photoPath: string;
  photoUrl: string;
  headline: string;
  body: string;
  linkType: AdvertLinkType;
  linkId: string;
  updatedAt: string;
};

export type BlockKind = "image" | "url" | "text";

export type ContentBlock = {
  id: string;
  siteId: string;
  group: string;
  key: string;
  label: string;
  kind: BlockKind;
  value: string;
  hint: string;
  maxLen: number;
  updatedAt: string;
};

export type ChangeLog = {
  id: string;
  clientId: string;
  summary: string;
  at: string;
  actor: string;
};

export type Session = {
  userId: string;
};

export type AppTables = {
  users: User[];
  clients: Client[];
  sites: Site[];
  monitors: Monitor[];
  incidents: Incident[];
  renewals: Renewal[];
  visitors: VisitorDay[];
  requests: SupportRequest[];
  blocks: ContentBlock[];
  log: ChangeLog[];
  enquiries: Enquiry[];
  media: MediaAsset[];
  invoices: Invoice[];
  products: Product[];
  events: CalendarEvent[];
  bookings: Booking[];
  sections: ContentSection[];
  adverts: WeeklyAdvert[];
};
