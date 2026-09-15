/**
 * Public-site contract.
 *
 * A live site (Collage, a guest house, a plumber) does not log into Manager.
 * It reads published rows with the anon key:
 *
 *   const { data } = await supabase.rpc("get_public_site", { p_host: "collagekerk.co.za" })
 *
 * And posts the contact form with:
 *
 *   await supabase.rpc("submit_public_enquiry", {
 *     p_host: "collagekerk.co.za",
 *     p_name, p_email, p_phone, p_message,
 *   })
 *
 * Until that site is wired, saving in Manager only writes Postgres.
 * It is not live on the public internet.
 */

export type PublicSitePayload = {
  tenant: {
    name: string;
    city: string;
    phone: string;
    email: string;
    address: string;
    hours: string;
    whatsapp: string;
    modules: { store: boolean; calendar: boolean; bookings: boolean; advert: boolean };
  };
  site: { host: string; url: string };
  blocks: Array<{
    group: string;
    key: string;
    kind: "image" | "url" | "text";
    value: string;
    label: string;
  }>;
  products: Array<{
    name: string;
    priceZar: number;
    stock: number;
    photoPath: string;
    note: string;
  }>;
  events: Array<{
    title: string;
    startsAt: string;
    endsAt: string;
    place: string;
    notes: string;
  }>;
};
