#!/usr/bin/env node
/**
 * Local/staging demo CLIENT login so you can open the shop UI.
 * Never run in production. Never creates this user from the app bundle.
 *
 *   ASC_ALLOW_SEED=true npm run seed:demo
 *
 * Keep email/password in sync with `src/lib/auth/local-demo.ts`.
 */
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const EMAIL = "demo.client@example.com";
const PASSWORD = "DemoShop26";
const NAME = "Demo shop";
const TENANT_NAME = "Demo Shop";

if (process.env.ASC_ALLOW_SEED !== "true") {
  console.error("Refusing: set ASC_ALLOW_SEED=true for local/staging only.");
  process.exit(1);
}
if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("Refusing: this seed is not for production.");
  process.exit(1);
}

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !service) {
  console.error("Need VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = data.users ?? [];
    const hit = users.find((u) => (u.email || "").toLowerCase() === email);
    if (hit) return hit;
    if (users.length < 200) return null;
    page += 1;
  }
}

const { data: existingTenant, error: findTenantError } = await admin
  .from("tenants")
  .select("id")
  .eq("name", TENANT_NAME)
  .maybeSingle();
if (findTenantError) {
  console.error(findTenantError.message);
  process.exit(1);
}

let tenantId = existingTenant?.id ?? null;
if (!tenantId) {
  const { data: created, error } = await admin
    .from("tenants")
    .insert({
      name: TENANT_NAME,
      city: "Pretoria",
      contact_name: NAME,
      email: EMAIL,
      status: "active",
      modules_store: true,
      modules_calendar: true,
      modules_bookings: true,
      modules_advert: true,
    })
    .select("id")
    .single();
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  tenantId = created.id;
  console.log(`Created tenant ${TENANT_NAME}`);
} else {
  console.log(`Using tenant ${TENANT_NAME}`);
}

const meta = { role: "client", name: NAME, tenant_id: tenantId };
let user = await findUserByEmail(EMAIL);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  user = data.user;
  console.log(`Created auth user ${EMAIL}`);
} else {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`Reset password for ${EMAIL}`);
}

const { data: profile, error: profileReadError } = await admin
  .from("profiles")
  .select("user_id, tenant_id, role")
  .eq("user_id", user.id)
  .maybeSingle();
if (profileReadError) {
  console.error(profileReadError.message);
  process.exit(1);
}
if (!profile) {
  const { error: profileError } = await admin.from("profiles").insert({
    user_id: user.id,
    tenant_id: tenantId,
    role: "client",
    name: NAME,
    email: EMAIL,
  });
  if (profileError) {
    console.error(profileError.message);
    process.exit(1);
  }
  console.log("Created client profile");
} else if (profile.tenant_id !== tenantId || profile.role !== "client") {
  console.error(
    "Demo user exists but the profile is not this client. Delete it in Supabase Auth and re-run.",
  );
  process.exit(1);
}

const { count, error: countError } = await admin
  .from("products")
  .select("id", { count: "exact", head: true })
  .eq("tenant_id", tenantId);
if (countError) {
  console.error(countError.message);
  process.exit(1);
}
if (!count) {
  const { error } = await admin.from("products").insert([
    {
      tenant_id: tenantId,
      name: "House blend coffee",
      price_zar: 85,
      stock: 12,
      live: true,
      note: "250g bag. Medium roast.",
      sort_order: 0,
      featured: true,
    },
    {
      tenant_id: tenantId,
      name: "Canvas tote",
      price_zar: 180,
      stock: 0,
      live: true,
      note: "Natural canvas. Screen print.",
      sort_order: 1,
      featured: false,
    },
    {
      tenant_id: tenantId,
      name: "Enamel mug",
      price_zar: 65,
      stock: 8,
      live: false,
      note: "Draft — not on the public site yet.",
      sort_order: 2,
      featured: false,
    },
  ]);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log("Added sample products");
}

console.log("");
console.log("Demo client login (local/staging only)");
console.log(`  email:    ${EMAIL}`);
console.log(`  password: ${PASSWORD}`);
console.log("  open:     http://localhost:8080/store");
