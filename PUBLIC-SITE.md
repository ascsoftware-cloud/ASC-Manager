# Public site contract

Manager writes. The client’s **public** site reads. Same ASC Supabase project. Never a second database per church.

| Surface | Where |
|---|---|
| Manager | `manager.ascsoftware.co.za` |
| Marketing | `ascsoftware.co.za` |
| Client public site | own Vercel project + their domain (e.g. `collagekerk.co.za`) |

## Auth

The public site uses the **anon** key only. No staff session. No service role in the browser.

## Read

```js
const { data } = await supabase.rpc("get_public_site", {
  p_host: "www.collagekerk.co.za",
})
```

`p_host` must match `sites.host` (no `https://`).

Returns:

- `tenant` — name, city, phone, hours, WhatsApp, modules
- `site` — host, url
- `sections` — homepage blocks (`welcome`, `this_week`, `this_sunday`, `featured`, `hours`), `sortOrder`, `visible`, `payload`
- `advert` — the one **live** weekly advert whose dates cover today, or `null`. Only present when the tenant’s **Advert** module is on (Collage-style sites). Other tenants never get This week.
- `products` — live items only, `sortOrder` is shop order (empty if store module off)
- `events` — upcoming calendar rows (empty if calendar module off)

An expired or draft advert is not in `advert`. Hidden sections are omitted.

Photos: `photoPath` is a Storage path on bucket `media`. Public URL:

`{SUPABASE_URL}/storage/v1/object/public/media/{photoPath}`

## Write (contact form)

```js
await supabase.rpc("submit_public_enquiry", {
  p_host: "www.collagekerk.co.za",
  p_name, p_email, p_phone, p_message,
})
```

Shows under **Enquiries** for that tenant only.

## What Manager owns

`products` (including `sort_order`, `featured`, `photo_path`), `weekly_adverts`, `content_sections`, `calendar_events`, `media`, tenant business fields.

The public Vercel app does not write those tables except via the enquiry RPC.
