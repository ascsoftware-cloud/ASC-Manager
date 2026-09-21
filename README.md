# ASC Manager

Multi-tenant control panel for **Atlas Scale Collective (Pty) Ltd** (ASC Software), Pretoria.

Staff (Gregory + Tiaan) run every client from a top nav. Clients log in and only see their own site — left sidebar, modules on/off.

Auth is **invite-only** via Supabase. There are no demo passwords and no preview accounts.

## Stack

TanStack Start, Vite, React, Tailwind v4, **Supabase Auth + Postgres RLS + Storage**. Hosted on Vercel. Payments later: Yoco / PayFast only, ZAR.

## Local setup

1. Create a Supabase project (staging ≠ production).
2. In **Authentication → Providers → Email**, disable public sign-ups. Keep “Confirm email”.
3. Paste [`supabase/migrations/20260915120000_init.sql`](./supabase/migrations/20260915120000_init.sql) into the SQL editor (or `supabase db push` if you use the CLI).
4. Copy [`.env.example`](./.env.example) to `.env.local` and fill in the project URL, anon key, and **service role** (server only).
5. Invite Gregory and Tiaan as operators — emails are not hardcoded:

```bash
npm install
ASC_OPERATOR_EMAIL=tiaan@ascsoftware.co.za ASC_OPERATOR_NAME="Tiaan Schoeman" npm run bootstrap:operators
```

6. `npm run dev` — sign in with the invite mail, set a password. Empty workspace is correct.

Optional example **tenants** (no logins) for staging:

```bash
ASC_ALLOW_SEED=true npm run seed:staging
```

Never set `ASC_ALLOW_SEED` in production.

## Public site contract

A live site does not log into Manager. With the anon key:

```js
await supabase.rpc("get_public_site", { p_host: "collagekerk.co.za" })
await supabase.rpc("submit_public_enquiry", {
  p_host: "collagekerk.co.za",
  p_name, p_email, p_phone, p_message,
})
```

Or `GET /api/public/site?host=collagekerk.co.za` from this app.

Until that site is wired, saving Website / Store / Calendar / Business only writes Postgres.

## Map

| Path | What |
|---|---|
| `src/components/login-screen.tsx` | Email/password. Invite-only. |
| `src/components/app-shell.tsx` | Staff top nav vs client left rail |
| `src/lib/types.ts` | Domain model |
| `src/lib/store.ts` | Supabase read/write, scoped by RLS |
| `supabase/migrations/` | Schema + RLS + storage + public RPCs |
| `src/routes/_app/` | Pages |

Collage Gemeenskapskerk is a **client you create and invite**. Do not invent a church login in the repo..
