import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authCallbackUrl } from "./auth/email-callback";
import { cleanPermissions } from "./permissions";
import { appOrigin, staffEnv, supabaseAdmin } from "./staff-admin.server";
import type {
  AddMemberInput,
  MemberRefInput,
  TeamBase,
  TeamMemberInput,
  UpdateMemberInput,
} from "./team";

/** An email server that never answers should be an error, not a spinner. */
function withTimeout<T>(work: PromiseLike<T>, message: string, ms = 25_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(work).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(message));
      },
    );
  });
}

const EMAIL_TIMEOUT =
  "The email server did not answer. Check the SMTP settings in Supabase (Authentication, Emails, SMTP Settings).";

type Caller = {
  admin: SupabaseClient;
  callerId: string;
  tenantId: string;
};

type Member = {
  user_id: string;
  email: string;
  name: string;
  access: "admin" | "staff";
};

/**
 * Who is asking, and which account are they allowed to change?
 * - A client admin acts on their own account only (any `tenantId` is ignored).
 * - ASC staff must say which client account.
 * - Client staff logins and everyone else are refused.
 */
async function requireTeamCaller(base: TeamBase): Promise<Caller> {
  const url = staffEnv("VITE_SUPABASE_URL") || staffEnv("SUPABASE_URL");
  const anon = staffEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !anon || !staffEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    throw new Error("Server is missing Supabase credentials.");
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${base.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser(base.accessToken);
  if (userErr || !userRes.user) throw new Error("Signed out.");

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, tenant_id, access")
    .eq("user_id", userRes.user.id)
    .maybeSingle();

  if (profile?.role === "operator") {
    const tenantId = base.tenantId?.trim();
    if (!tenantId) throw new Error("Pick a client first.");
    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .maybeSingle();
    if (!tenant) throw new Error("Client not found.");
    return { admin, callerId: userRes.user.id, tenantId };
  }
  if (profile?.role === "client" && profile.access === "admin" && profile.tenant_id) {
    return { admin, callerId: userRes.user.id, tenantId: String(profile.tenant_id) };
  }
  throw new Error("Only an account admin can manage the team.");
}

async function loadMember(caller: Caller, userId: string): Promise<Member> {
  const { data } = await caller.admin
    .from("profiles")
    .select("user_id, email, name, access")
    .eq("user_id", userId)
    .eq("tenant_id", caller.tenantId)
    .eq("role", "client")
    .maybeSingle();
  if (!data) throw new Error("That person is not on this account.");
  return data as Member;
}

async function adminCount(caller: Caller): Promise<number> {
  const { count } = await caller.admin
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("tenant_id", caller.tenantId)
    .eq("role", "client")
    .eq("access", "admin");
  return count ?? 0;
}

/** Normalised access fields, with site ids checked against this account's sites. */
async function cleanAccess(
  caller: Caller,
  input: TeamMemberInput,
): Promise<{ access: "admin" | "staff"; permissions: string[]; siteIds: string[] }> {
  if (input.access !== "admin" && input.access !== "staff") {
    throw new Error("Pick Admin or Staff.");
  }
  if (input.access === "admin") return { access: "admin", permissions: [], siteIds: [] };

  const permissions = cleanPermissions(input.permissions);
  const wanted = [...new Set(input.siteIds)];
  if (wanted.length > 0) {
    const { data: rows } = await caller.admin
      .from("sites")
      .select("id")
      .eq("tenant_id", caller.tenantId)
      .in("id", wanted);
    if ((rows?.length ?? 0) !== wanted.length) {
      throw new Error("One of those sites is not on this account.");
    }
  }
  return { access: "staff", permissions, siteIds: wanted };
}

export async function addTeamMember(data: AddMemberInput): Promise<{ ok: true }> {
  const caller = await requireTeamCaller(data);
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  if (!email.includes("@") || !name) throw new Error("Name and email are required.");

  const { data: existing } = await caller.admin
    .from("profiles")
    .select("user_id")
    .ilike("email", email)
    .maybeSingle();
  if (existing) throw new Error("That email already has a login.");

  const access = await cleanAccess(caller, data);
  const { error } = await withTimeout(
    caller.admin.auth.admin.inviteUserByEmail(email, {
      data: {
        role: "client",
        name,
        tenant_id: caller.tenantId,
        access: access.access,
        permissions: access.permissions,
        site_ids: access.siteIds,
      },
      redirectTo: authCallbackUrl(appOrigin()),
    }),
    EMAIL_TIMEOUT,
  );
  if (error) throw new Error("Could not send that invite.");
  return { ok: true };
}

export async function updateTeamMember(data: UpdateMemberInput): Promise<{ ok: true }> {
  const caller = await requireTeamCaller(data);
  const member = await loadMember(caller, data.userId);
  const name = data.name.trim();
  if (!name) throw new Error("Name is required.");

  const access = await cleanAccess(caller, data);
  if (member.access === "admin" && access.access === "staff") {
    if (member.user_id === caller.callerId) {
      throw new Error("You cannot make yourself staff. Ask another admin.");
    }
    if ((await adminCount(caller)) <= 1) {
      throw new Error("An account needs at least one admin.");
    }
  }

  const { error } = await caller.admin
    .from("profiles")
    .update({
      name,
      access: access.access,
      permissions: access.permissions,
      site_ids: access.siteIds,
    })
    .eq("user_id", member.user_id)
    .eq("tenant_id", caller.tenantId);
  if (error) throw new Error("Could not save that person.");
  return { ok: true };
}

export async function removeTeamMember(data: MemberRefInput): Promise<{ ok: true }> {
  const caller = await requireTeamCaller(data);
  const member = await loadMember(caller, data.userId);
  if (member.user_id === caller.callerId) {
    throw new Error("You cannot remove yourself.");
  }
  if (member.access === "admin" && (await adminCount(caller)) <= 1) {
    throw new Error("An account needs at least one admin.");
  }
  const { error } = await caller.admin.auth.admin.deleteUser(member.user_id);
  if (error) throw new Error("Could not remove that person.");
  return { ok: true };
}

export async function resetTeamPassword(data: MemberRefInput): Promise<{ ok: true }> {
  const caller = await requireTeamCaller(data);
  const member = await loadMember(caller, data.userId);
  const { error } = await withTimeout(
    caller.admin.auth.resetPasswordForEmail(member.email, {
      redirectTo: authCallbackUrl(appOrigin()),
    }),
    EMAIL_TIMEOUT,
  );
  if (error) throw new Error("Could not send the reset email. Try again in a minute.");
  return { ok: true };
}
