#!/usr/bin/env node
/**
 * Invite the first ASC operator accounts. Run once per Supabase project.
 * Does not hardcode emails in the app. Never run this as a production seed of
 * client users.
 *
 *   ASC_OPERATOR_EMAIL=tiaan@ascsoftware.co.za
 *   ASC_OPERATOR_NAME=Tiaan Schoeman
 *   ASC_OPERATOR_EMAIL_2=gregory@ascsoftware.co.za
 *   ASC_OPERATOR_NAME_2=Gregory
 */
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const appUrl = (process.env.VITE_APP_URL || "http://localhost:8080").replace(/\/$/, "");

const people = [
  {
    email: (process.env.ASC_OPERATOR_EMAIL || "").trim(),
    name: (process.env.ASC_OPERATOR_NAME || "").trim(),
  },
  {
    email: (process.env.ASC_OPERATOR_EMAIL_2 || "").trim(),
    name: (process.env.ASC_OPERATOR_NAME_2 || "").trim(),
  },
].filter((p) => p.email);

if (!url || !service) {
  console.error("Need VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (people.length === 0) {
  console.error("Set ASC_OPERATOR_EMAIL and ASC_OPERATOR_NAME (optional _2).");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const person of people) {
  const { error } = await admin.auth.admin.inviteUserByEmail(person.email.toLowerCase(), {
    data: { role: "operator", name: person.name || person.email, tenant_id: null },
    redirectTo: `${appUrl}/auth/callback`,
  });
  if (error) {
    console.error(`Failed for ${person.email}: ${error.message}`);
    process.exit(1);
  }
  console.log(`Invited operator ${person.email}`);
}
