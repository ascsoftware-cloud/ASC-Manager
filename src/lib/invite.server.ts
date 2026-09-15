import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { InviteInput } from "./invite";

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

function env(key: string): string {
  return process.env[key]?.trim() || readDotEnv()[key]?.trim() || "";
}

export async function inviteUser(data: InviteInput): Promise<{ ok: true }> {
  const url = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
  const anon = env("VITE_SUPABASE_ANON_KEY");
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    throw new Error("Server is missing Supabase credentials.");
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser(
    data.accessToken,
  );
  if (userErr || !userRes.user) {
    throw new Error("Signed out.");
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  if (profile?.role !== "operator") {
    throw new Error("Forbidden.");
  }

  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  if (!email.includes("@") || !name) {
    throw new Error("Name and email are required.");
  }
  if (data.role === "client" && !data.tenantId) {
    throw new Error("Client invite needs a tenant.");
  }
  if (data.role === "operator" && data.tenantId) {
    throw new Error("Staff accounts are not tied to a client.");
  }

  const redirectTo = `${(env("VITE_APP_URL") || "http://localhost:8080").replace(/\/$/, "")}/auth/callback`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: data.role,
      name,
      tenant_id: data.role === "client" ? data.tenantId : null,
    },
    redirectTo,
  });
  if (error) {
    throw new Error("Could not send that invite.");
  }
  return { ok: true };
}
