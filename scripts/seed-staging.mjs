#!/usr/bin/env node
/**
 * Optional example tenants for local/staging ONLY.
 * Never creates logins. Never run in production.
 *
 *   ASC_ALLOW_SEED=true npm run seed:staging
 */
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

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

const tenants = [
  {
    name: "Bosveld Plumbing",
    city: "Pretoria",
    contact_name: "Office",
    status: "active",
    modules_store: false,
    modules_calendar: false,
  },
  {
    name: "Kloof View Guest House",
    city: "Hartbeespoort",
    contact_name: "Office",
    status: "active",
    modules_store: false,
    modules_calendar: true,
  },
  {
    name: "Tshwane Auto Spares",
    city: "Pretoria",
    contact_name: "Office",
    status: "active",
    modules_store: true,
    modules_calendar: false,
  },
  {
    name: "Collage Gemeenskapskerk",
    city: "Pretoria",
    contact_name: "Office",
    status: "active",
    modules_store: true,
    modules_calendar: true,
  },
];

for (const row of tenants) {
  const { data: existing, error: findError } = await admin
    .from("tenants")
    .select("id")
    .eq("name", row.name)
    .maybeSingle();
  if (findError) {
    console.error(findError.message);
    process.exit(1);
  }
  if (existing) {
    console.log(`Exists: ${row.name}`);
    continue;
  }
  const { error } = await admin.from("tenants").insert(row);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`Inserted tenant ${row.name} (no users)`);
}
