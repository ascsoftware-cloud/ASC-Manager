import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let fileEnv: Record<string, string> | null = null;

function readDotEnv(): Record<string, string> {
  if (fileEnv) return fileEnv;
  fileEnv = {};
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      fileEnv[key] = value;
    }
  } catch {
    // .env.local is optional; Vercel injects process.env
  }
  return fileEnv;
}

export function staffEnv(key: string): string {
  return process.env[key]?.trim() || readDotEnv()[key]?.trim() || "";
}

export function appOrigin(): string {
  let raw = (staffEnv("VITE_APP_URL") || "http://localhost:8080").trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(raw)) {
    raw = raw.includes("localhost") ? `http://${raw}` : `https://${raw}`;
  }
  return raw;
}

export function supabaseAdmin(): SupabaseClient {
  const url = staffEnv("VITE_SUPABASE_URL") || staffEnv("SUPABASE_URL");
  const service = staffEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) {
    throw new Error("Server is missing Supabase credentials.");
  }
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireOperatorAdmin(accessToken: string): Promise<{
  admin: SupabaseClient;
}> {
  const url = staffEnv("VITE_SUPABASE_URL") || staffEnv("SUPABASE_URL");
  const anon = staffEnv("VITE_SUPABASE_ANON_KEY");
  const service = staffEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    throw new Error("Server is missing Supabase credentials.");
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser(accessToken);
  if (userErr || !userRes.user) {
    throw new Error("Signed out.");
  }

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  if (profile?.role !== "operator") {
    throw new Error("Forbidden.");
  }
  return { admin };
}
