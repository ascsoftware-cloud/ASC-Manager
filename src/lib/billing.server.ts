import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { lookup } from "node:dns/promises";
import { canStartPayment, linkExpiry, linkIsUsable } from "./billing-access";
import { priceMonthlyPlan, type PlanChoice } from "./billing-plans";
import {
  API_BASE,
  apiHeaders,
  apiQuery,
  buildCheckout,
  hashLinkToken,
  ipAllowed,
  newLinkToken,
  notifyHosts,
  payfastMode,
  validateUrl,
  type Pair,
  type PayfastMode,
} from "./payfast";
import { createItnService, type ItnStore, type PlanRow } from "./payfast-itn-service";
import { appOrigin, requireOperatorAdmin, staffEnv, supabaseAdmin } from "./staff-admin.server";

const NOT_SET_UP = "Online payments are not set up yet. Please ask us to finish setting them up.";

type Config = {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  mode: PayfastMode;
};

function config(): Config {
  const merchantId = staffEnv("PAYFAST_MERCHANT_ID");
  const merchantKey = staffEnv("PAYFAST_MERCHANT_KEY");
  if (!merchantId || !merchantKey) throw new Error(NOT_SET_UP);
  return {
    merchantId,
    merchantKey,
    passphrase: staffEnv("PAYFAST_PASSPHRASE"),
    mode: payfastMode(staffEnv("PAYFAST_MODE")),
  };
}

/** Today's date in South Africa, as YYYY-MM-DD. */
function todayZa(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
}

type SubRow = {
  id: string;
  tenant_id: string;
  amount_zar: number | string;
  item: string;
  status: PlanRow["status"];
  payfast_token: string | null;
};

async function subscriptionFor(admin: SupabaseClient, tenantId: string): Promise<SubRow | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("id, tenant_id, amount_zar, item, status, payfast_token")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error("Could not load the monthly plan.");
  return (data as SubRow | null) ?? null;
}

function checkoutFor(
  sub: SubRow,
  who: { email?: string; name?: string },
  urls: { returnUrl: string; cancelUrl: string },
) {
  const c = config();
  return buildCheckout({
    ...c,
    ...urls,
    notifyUrl: `${appOrigin()}/api/payfast/itn`,
    subscriptionId: sub.id,
    amountZar: Number(sub.amount_zar),
    itemName: sub.item,
    emailAddress: who.email,
    nameFirst: who.name?.split(" ")[0],
    billingDate: todayZa(),
  });
}

/* ---------------------------------------------------------------- staff */

export async function setPlan(input: {
  accessToken: string;
  tenantId: string;
  choice: PlanChoice;
  database: boolean;
  customAmountZar?: number;
}): Promise<{ ok: true }> {
  const { admin } = await requireOperatorAdmin(input.accessToken);
  // The total is worked out here from the price list, never taken from the browser.
  const priced = priceMonthlyPlan({
    choice: input.choice,
    database: input.database,
    customAmountZar: input.customAmountZar,
  });
  if (!priced.ok) throw new Error(priced.error);

  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("id", input.tenantId)
    .maybeSingle();
  if (!tenant) throw new Error("Client not found.");

  const fields = {
    package: priced.choice,
    has_database: priced.database,
    amount_zar: priced.amountZar,
    item: priced.item,
  };
  const existing = await subscriptionFor(admin, input.tenantId);
  if (!existing) {
    const { error } = await admin
      .from("subscriptions")
      .insert({ tenant_id: input.tenantId, ...fields });
    if (error) throw new Error("Could not save the plan.");
    return { ok: true };
  }
  if (existing.status === "active" && Number(existing.amount_zar) !== priced.amountZar) {
    throw new Error("This plan is already running. Cancel it first, then set the new amount.");
  }
  const reset = existing.status === "cancelled";
  const { error } = await admin
    .from("subscriptions")
    .update({
      ...fields,
      ...(reset ? { status: "awaiting", payfast_token: null, failed_at: null } : {}),
    })
    .eq("id", existing.id);
  if (error) throw new Error("Could not save the plan.");
  return { ok: true };
}

export async function createPaymentLink(input: {
  accessToken: string;
  tenantId: string;
}): Promise<{ url: string; expiresAt: string }> {
  const { admin, userId } = await requireOperatorAdmin(input.accessToken);
  const sub = await subscriptionFor(admin, input.tenantId);
  if (!sub) throw new Error("Set the monthly amount first.");
  if (sub.status === "active") throw new Error("This client is already paying monthly.");

  const token = newLinkToken();
  const expires = linkExpiry(new Date());
  const { error } = await admin.from("payment_links").insert({
    tenant_id: input.tenantId,
    token_hash: hashLinkToken(token),
    expires_at: expires.toISOString(),
    created_by: userId,
  });
  if (error) throw new Error("Could not make the link.");
  return { url: `${appOrigin()}/pay/${token}`, expiresAt: expires.toISOString() };
}

export async function cancelSubscription(input: {
  accessToken: string;
  tenantId: string;
}): Promise<{ ok: true }> {
  const { admin } = await requireOperatorAdmin(input.accessToken);
  const sub = await subscriptionFor(admin, input.tenantId);
  if (!sub) throw new Error("There is no monthly plan to cancel.");
  if (sub.status === "cancelled") return { ok: true };

  if (sub.payfast_token) {
    const c = config();
    const res = await fetch(
      `${API_BASE}/subscriptions/${encodeURIComponent(sub.payfast_token)}/cancel${apiQuery(c.mode)}`,
      { method: "PUT", headers: apiHeaders(c.merchantId, c.passphrase) },
    );
    if (!res.ok)
      throw new Error("PayFast would not cancel it. Try again, or cancel it in PayFast.");
  }
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", sub.id);
  if (error) throw new Error("Could not update the plan.");
  return { ok: true };
}

/* --------------------------------------------------------------- client */

export async function startCheckout(input: { accessToken: string }) {
  const url = staffEnv("VITE_SUPABASE_URL") || staffEnv("SUPABASE_URL");
  const anon = staffEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Server is missing Supabase credentials.");
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${input.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error } = await userClient.auth.getUser(input.accessToken);
  if (error || !userRes.user) throw new Error("Signed out.");

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, access, permissions, tenant_id, name, email")
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  if (
    !profile ||
    !canStartPayment({
      role: profile.role,
      access: profile.access,
      permissions: profile.permissions,
      tenantId: profile.tenant_id,
    })
  ) {
    throw new Error("Only an account admin can set up the monthly payment.");
  }

  const sub = await subscriptionFor(admin, String(profile.tenant_id));
  if (!sub)
    throw new Error("Your monthly plan has not been set up yet. Ask us and we will sort it out.");
  if (sub.status === "active") throw new Error("Your monthly payment is already set up.");

  const origin = appOrigin();
  // A plan that is already running but failed keeps its PayFast subscription:
  // send them to PayFast's card-update page instead of starting a second one.
  if (sub.status === "failed" && sub.payfast_token) {
    const mode = config().mode;
    const base = mode === "live" ? "https://www.payfast.co.za" : "https://sandbox.payfast.co.za";
    return {
      action: `${base}/eng/recurring/update/${encodeURIComponent(sub.payfast_token)}?return=${encodeURIComponent(`${origin}/billing?payment=updated`)}`,
      fields: [] as Pair[],
    };
  }
  return checkoutFor(
    sub,
    { email: String(profile.email ?? ""), name: String(profile.name ?? "") },
    { returnUrl: `${origin}/billing?payment=thanks`, cancelUrl: `${origin}/billing` },
  );
}

/* ------------------------------------------------- payment link (no login) */

export type PaymentLinkView =
  | { state: "invalid" }
  | { state: "active"; clientName: string }
  | {
      state: "ready";
      clientName: string;
      amountZar: number;
      item: string;
      action: string;
      fields: Pair[];
    };

/** Opens a link staff sent. Shows only the name and amount; never anything else about the client. */
export async function resolvePaymentLink(token: string): Promise<PaymentLinkView> {
  if (!token || token.length < 20) return { state: "invalid" };
  const admin = supabaseAdmin();
  const { data: link } = await admin
    .from("payment_links")
    .select("tenant_id, expires_at")
    .eq("token_hash", hashLinkToken(token))
    .maybeSingle();
  if (!link || !linkIsUsable({ expiresAt: String(link.expires_at) }, new Date())) {
    return { state: "invalid" };
  }
  const tenantId = String(link.tenant_id);
  const [{ data: tenant }, sub] = await Promise.all([
    admin.from("tenants").select("name, email").eq("id", tenantId).maybeSingle(),
    subscriptionFor(admin, tenantId),
  ]);
  if (!tenant || !sub || sub.status === "cancelled") return { state: "invalid" };
  const clientName = String(tenant.name ?? "");
  if (sub.status === "active") return { state: "active", clientName };

  const origin = appOrigin();
  const { action, fields } = checkoutFor(
    sub,
    { email: String(tenant.email ?? "") },
    { returnUrl: `${origin}/pay/${token}?done=1`, cancelUrl: `${origin}/pay/${token}` },
  );
  return {
    state: "ready",
    clientName,
    amountZar: Number(sub.amount_zar),
    item: sub.item,
    action,
    fields,
  };
}

/* ------------------------------------------------------------- webhook */

async function payfastIps(mode: PayfastMode): Promise<string[]> {
  const found = await Promise.all(
    notifyHosts(mode).map((h) => lookup(h, { all: true, family: 4 }).catch(() => [])),
  );
  return found.flat().map((a) => a.address);
}

function itnStore(admin: SupabaseClient): ItnStore {
  return {
    async findSubscription(id) {
      const { data } = await admin
        .from("subscriptions")
        .select("id, tenant_id, amount_zar, status")
        .eq("id", id)
        .maybeSingle();
      return data
        ? {
            id: String(data.id),
            tenantId: String(data.tenant_id),
            amountZar: Number(data.amount_zar),
            status: data.status as PlanRow["status"],
          }
        : null;
    },
    async paymentSeen(pfPaymentId) {
      const { data } = await admin
        .from("payments")
        .select("id")
        .eq("pf_payment_id", pfPaymentId)
        .maybeSingle();
      return Boolean(data);
    },
    async recordPayment(p) {
      const { error } = await admin.from("payments").insert({
        tenant_id: p.tenantId,
        subscription_id: p.subscriptionId,
        pf_payment_id: p.pfPaymentId,
        amount_zar: p.amountZar,
        status: p.status,
      });
      if (error) throw new Error("Could not record the payment.");
    },
    async update(subscriptionId, patch) {
      const { error } = await admin
        .from("subscriptions")
        .update({
          status: patch.status,
          ...(patch.payfastToken ? { payfast_token: patch.payfastToken } : {}),
          ...(patch.lastPaidAt !== undefined ? { last_paid_at: patch.lastPaidAt } : {}),
          ...(patch.failedAt !== undefined ? { failed_at: patch.failedAt } : {}),
          ...(patch.nextBillingOn !== undefined ? { next_billing_on: patch.nextBillingOn } : {}),
        })
        .eq("id", subscriptionId);
      if (error) throw new Error("Could not update the plan.");
    },
  };
}

/** PayFast calls this after every payment. Answers 200 only when we trust and have handled it. */
export async function handleItn(request: Request): Promise<{ status: number; message: string }> {
  let c: Config;
  try {
    c = config();
  } catch {
    return { status: 503, message: "Payments are not set up" };
  }
  const body = await request.text();
  const pairs: Pair[] = [...new URLSearchParams(body).entries()];

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const sourceIsPayfast = forwarded ? ipAllowed(forwarded, await payfastIps(c.mode)) : false;

  const service = createItnService({
    passphrase: c.passphrase,
    store: itnStore(supabaseAdmin()),
    async confirmWithPayfast(confirmation) {
      const res = await fetch(validateUrl(c.mode), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: confirmation,
      });
      return (await res.text()).trim() === "VALID";
    },
  });
  return service.handle(pairs, sourceIsPayfast);
}
