You are working on **ASC Manager** for Atlas Scale Collective (Pty) Ltd (ASC Software), Pretoria. Owners: Gregory (the Goat) and Tiaan Schoeman. Enterprise 2026/726493/07.

Be blunt and direct. No filler. SA context: ZAR, POPIA, Yoco / PayFast only. Do not invent other payment providers.

This repo is already open in VS Code. You have a shell. You are **not** in the Grok App Builder sandbox. Ignore any leftover App Builder rules (port 8080 preview contract, demo logins, localStorage-as-database).

---

## What this repo is

A **TanStack Start + React + Vite + Tailwind v4** UI for a multi-tenant control panel. Prototyped in Grok App Builder. **The UI and information architecture are the product.** The data layer is a fake.

Today:

- Sign-in is a **client-side demo**. Users and passwords live in `src/lib/seed.ts`. Password for every preview account is `Pretoria26`. Session is Zustand + localStorage (`asc-manager-v5`).
- There is **no real auth**. `src/lib/auth/email-password.ts` has `emailAndPasswordEnabled = false`. Better Auth / PGLite scaffolding exists from the App Builder template — **do not treat that as the production plan**.
- Content, store, calendar, enquiries, invoices, media are **in-memory seed + persist**. They do not write to a public website.
- Seed tenants (Kloof View, Bosveld Plumbing, Tshwane Auto Spares, **Collage Gemeenskapskerk**) are **examples only**. `kantoor@collagekerk.co.za` is not a real church login. Real client people get invited later.

**Your job:** keep the look and the two-audience UX, then replace the fake layer so this is a real web app: real accounts, real database, real isolation, **no demo sign-ins**.

---

## Two audiences (do not mix them)

1. **ASC staff (operators)** — Gregory and Tiaan. Top navigation. They see every client: Dashboard, Clients, Sites, Monitors, Incidents, Renewals, Visitors, Requests, Admin. They add tenants, turn modules on/off, invite client users, mark invoices paid.
2. **Client users** — left sidebar. They see **only their tenant**. Never the company roster, never other churches/shops. Nav is module-aware: Website, Store, Calendar, Enquiries, Photos, Visitors, Billing, Ask ASC, Business.

Public login is **one** email + password form. No client picker. After sign-in, role decides the shell.

---

## Visual language (keep it)

Emerald ink + champagne. Dark luxury, not SaaS purple.

- Background / ink: `#081410`
- Emerald accent
- Champagne headings (`font-display`, Fraunces)
- IBM Plex Mono for UI labels
- Cream / champagne primary buttons, `rounded-full`
- KPI cards with left emerald bar
- Staff = top nav with emerald underline on the active item
- Client = left rail, company name, module links, sign out at the bottom

Tiaan’s original screenshots are in `attachments/` (`s-login.png`, `t-dash.png`, `t-client.png`, `t-content.png`). Match that chrome. Client left-rail was an agreed change after those shots.

---

## Kill list (do this first)

Remove all demo identity:

- Delete hardcoded users and `DEMO_PASSWORD` / `Pretoria26` from `src/lib/seed.ts` and the login “Preview accounts” block in `src/components/login-screen.tsx`.
- Stop using Zustand persist as the source of truth for users, sessions, tenants, products, events.
- `signIn` in `src/lib/store.ts` must not compare emails to a seed array.
- Empty states are fine. Fake people named Marinda / Piet / Lerato / Kantoor Collage are **not** for production.
- Keep **one** optional seed script for **local/staging only**, behind an env flag, never shipped to prod.

---

## Target stack (this is how it actually works)

Do **not** stay on localStorage.

| Piece | Choice |
|---|---|
| App | This repo (TanStack Start, Vite, React, Tailwind, shadcn) |
| Host | Vercel |
| Database | **Supabase Postgres** |
| Auth | **Supabase Auth** (email + password). Invite-only. No public self-signup. |
| Files | Supabase Storage (photos, advert images). Not data URLs in the DB. |
| Row security | **RLS on every table** keyed by `tenant_id` |
| Payments (later) | Yoco / PayFast only, ZAR |
| Email | Real transactional mail (invite + reset). Not `mailto:` as the product. |

ASC already uses this pattern (FociMed: TS, React, Supabase RLS, Vercel). Follow it.

If you prefer to finish Better Auth + Neon that is already in the template, say so and do it properly — but **Supabase + RLS is the default** unless Gregory says otherwise.

---

## Auth model

- **No demo logins. No shared password.**
- Staff create a **tenant**, then **invite** users by email. Invite sets `role` + `tenant_id`.
- Roles: `operator` (ASC staff, `tenant_id` null) and `client` (must have `tenant_id`).
- A tenant can have several client users (e.g. Collage kantoor + pastor later).
- Password reset via email. 2FA for operators when you get there.
- Session is an httpOnly secure cookie (or Supabase session). Never localStorage for secrets.
- After login: operator → staff dashboard. Client → that tenant’s overview. Wrong password = generic error. No user enumeration.
- Gregory and Tiaan get the first two operator accounts, created by you in Supabase — not hardcoded in the repo.

---

## Data model (mirror `src/lib/types.ts`)

Every business row has `tenant_id`. RLS:

- Operator policies: full read/write (or a tight staff role).
- Client policies: `tenant_id = auth.jwt() tenant` only.

Tables (snake_case):

- `tenants` — name, city, contact, phone, email, address, hours, whatsapp, status, `modules_store`, `modules_calendar`
- `profiles` — `user_id`, `tenant_id`, `role`, `name`
- `sites` — host, url, kind public/admin
- `monitors`, `incidents`, `renewals`
- `visitor_days`
- `requests` (Ask ASC)
- `content_blocks` — site_id, group, key, kind image/url/text, value
- `products` — name, price_zar, stock, live, photo_path, note
- `calendar_events` — title, starts_at, ends_at, place, notes
- `enquiries` — from the **public site form**, not typed in by staff as fake leads
- `media` — storage path, not a 4 MB data URL
- `invoices`
- `change_log`

**Website tab (Advert / Home blocks):** fields a client is allowed to change on **their** public site (banner, caption, welcome line, this Sunday). They only “work” when a real site reads those rows. Until the public Collage site is wired, saving a block updates the database — do not pretend it is live if it is not.

**Store** and **Calendar** are the same: Manager is the editor; the public site is the consumer.

---

## Modules

Per tenant, not global:

- Church (Collage-type): store **on**, calendar **on**
- Guest house: calendar on, store off
- Plumber: both off (enquiries + website + business)

Client sidebar **hides** Store / Calendar when the module is off. Staff toggle modules on the tenant record.

---

## What “works” means (acceptance)

A stranger cannot log in with `Pretoria26`.

Gregory can:

1. Sign in with a **real** operator account created in Supabase.
2. Create tenant “Collage Gemeenskapskerk”.
3. Invite a **real** email (later — not now).
4. Turn on store + calendar for that tenant.

That person can:

1. Set a password from the invite mail.
2. Sign in and see **only** Collage.
3. Add a hoodie on Store, add Erediens on Calendar, edit Website copy, see enquiries from their form.
4. Cannot open `/clients`, cannot see Kloof, cannot see ASC’s whole company.

Tiaan as operator sees all tenants.

No “Preview accounts” on the login page.

---

## Env / git / secrets

- `.env.local` gitignored. Example file only. Never commit Supabase service role or passwords.
- Staging ≠ production (separate Supabase projects).
- `npm install && npm run dev` locally. Vercel for preview + prod.
- Strip Grok App Builder PWA / preview-host glue when it gets in the way (`scripts/grok-pwa-plugin.mjs`, `public/__grok/`). Keep the app.

---

## First implementation order

1. Create Supabase project + schema + RLS. Migrations in the repo.
2. Invite-only auth. Strip seed users and preview passwords from the UI.
3. Replace Zustand persist so every page reads/writes Supabase, scoped by tenant.
4. Storage for photos.
5. Staff: create tenant, invite user, toggle modules.
6. Client: store, calendar, website blocks, enquiries, business details, billing read.
7. Public-site contract (even a stub): how Collage’s live site fetches blocks/products/events.
8. Then monitors/uptime if still wanted — secondary to “client can run their site”.

Do not gold-plate. Do not add Play Store wrappers. This is a **web app**.

---

## Standing launch + security bar (every ship)

Secrets/env/git; auth/perms/RLS; sanitization/XSS/SQLi; rate limits/CORS/CSRF/HTTPS/headers/cookies; file-upload validation (type + size, not trusting the client); no debug in prod; backups/2FA/audit; POPIA + T&Cs + privacy + cookie consent; meta/OG/favicon/sitemap/robots/alt; speed/mobile/contrast/404/CTA; analytics/error tracking; **Yoco/PayFast only**; staging ≠ prod.

---

## Do not

- Keep demo sign-ins “just for now” in production.
- Let a client see other tenants.
- Put a client picker on the public login page.
- Use WordPress.
- Store product photos as base64 in Postgres.
- Build native iOS/Android until the web app is real.
- Invent logins for Collage. They get invited when the church is a real tenant.

Start by mapping `src/lib/types.ts` + `src/lib/store.ts` + `src/lib/seed.ts` to Supabase, then delete the demo door on `src/components/login-screen.tsx`.
