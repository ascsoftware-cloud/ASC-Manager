/**
 * PayFast helpers: signing, the checkout form, and the rules for trusting a
 * payment notification (ITN). Server-side only (it uses node:crypto), and kept
 * free of app imports so it can be tested on its own.
 *
 * Field order matters to PayFast: the signature is an MD5 of the fields in the
 * order they are sent, so the order below is the one in PayFast's docs.
 */
import { createHash, randomBytes } from "node:crypto";

export type PayfastMode = "sandbox" | "live";
export type Pair = [string, string];

export function payfastMode(value: string | undefined): PayfastMode {
  return value?.trim().toLowerCase() === "live" ? "live" : "sandbox";
}

const HOST = { live: "https://www.payfast.co.za", sandbox: "https://sandbox.payfast.co.za" };

export const processUrl = (mode: PayfastMode) => `${HOST[mode]}/eng/process`;
export const validateUrl = (mode: PayfastMode) => `${HOST[mode]}/eng/query/validate`;
export const API_BASE = "https://api.payfast.co.za";
/** Sandbox calls use the same host with a testing flag. */
export const apiQuery = (mode: PayfastMode) => (mode === "sandbox" ? "?testing=true" : "");

/** Hostnames PayFast sends notifications from. Resolve these to get valid IPs. */
export function notifyHosts(mode: PayfastMode): string[] {
  return mode === "live"
    ? ["www.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"]
    : ["sandbox.payfast.co.za"];
}

/** PHP-style urlencode, which is what PayFast signs: spaces are "+", hex is upper case. */
export function payfastEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

/** The text that gets signed. Empty values are left out, as PayFast does. */
export function paramString(pairs: Pair[]): string {
  return pairs
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${k}=${payfastEncode(v)}`)
    .join("&");
}

export function sign(pairs: Pair[], passphrase: string): string {
  const base = paramString(pairs);
  return md5(passphrase ? `${base}&passphrase=${payfastEncode(passphrase)}` : base);
}

export type CheckoutInput = {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  mode: PayfastMode;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  /** Our subscription id. PayFast sends it back on every notification. */
  subscriptionId: string;
  amountZar: number;
  itemName: string;
  emailAddress?: string;
  nameFirst?: string;
  /** YYYY-MM-DD */
  billingDate: string;
};

/** The signed fields for a monthly, no-end-date card subscription. */
export function buildCheckout(input: CheckoutInput): { action: string; fields: Pair[] } {
  const amount = input.amountZar.toFixed(2);
  const pairs: Pair[] = [
    ["merchant_id", input.merchantId],
    ["merchant_key", input.merchantKey],
    ["return_url", input.returnUrl],
    ["cancel_url", input.cancelUrl],
    ["notify_url", input.notifyUrl],
    ["name_first", input.nameFirst ?? ""],
    ["email_address", input.emailAddress ?? ""],
    ["m_payment_id", input.subscriptionId],
    ["amount", amount],
    ["item_name", input.itemName.slice(0, 100)],
    ["subscription_type", "1"],
    ["billing_date", input.billingDate],
    ["recurring_amount", amount],
    ["frequency", "3"],
    ["cycles", "0"],
  ];
  const fields = pairs.filter(([, v]) => v !== "");
  fields.push(["signature", sign(fields, input.passphrase)]);
  return { action: processUrl(input.mode), fields };
}

/** Does the signature on a notification match? `pairs` must be in the order received. */
export function verifyItnSignature(pairs: Pair[], passphrase: string): boolean {
  const received = pairs.find(([k]) => k === "signature")?.[1];
  if (!received) return false;
  const rest = pairs.filter(([k]) => k !== "signature");
  return sign(rest, passphrase) === received.toLowerCase();
}

/** What we send back to PayFast to confirm a notification is genuine (no passphrase). */
export function confirmationBody(pairs: Pair[]): string {
  return paramString(pairs.filter(([k]) => k !== "signature"));
}

export function amountsMatch(a: string | number, b: string | number): boolean {
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && Math.round(x * 100) === Math.round(y * 100);
}

export function ipAllowed(ip: string, allowed: string[]): boolean {
  const clean = ip.trim().replace(/^::ffff:/, "");
  return clean !== "" && allowed.includes(clean);
}

/** Headers PayFast's API wants, signed. `fields` are every header and body value to sign. */
export function apiHeaders(merchantId: string, passphrase: string, now = new Date()) {
  const timestamp = now.toISOString().slice(0, 19);
  const all: Pair[] = [
    ["merchant-id", merchantId],
    ["passphrase", passphrase],
    ["timestamp", timestamp],
    ["version", "v1"],
  ];
  const sorted = [...all].sort(([a], [b]) => a.localeCompare(b));
  return {
    "merchant-id": merchantId,
    version: "v1",
    timestamp,
    signature: md5(paramString(sorted)),
  };
}

/** A link token: long, random, and only ever stored as a hash. */
export function newLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ItnStatus = "COMPLETE" | "FAILED" | "CANCELLED" | "PENDING" | "OTHER";

export function parseItn(pairs: Pair[]) {
  const get = (k: string) => pairs.find(([key]) => key === k)?.[1] ?? "";
  const s = get("payment_status").toUpperCase();
  const status: ItnStatus =
    s === "COMPLETE" || s === "FAILED" || s === "CANCELLED" || s === "PENDING" ? s : "OTHER";
  return {
    status,
    pfPaymentId: get("pf_payment_id"),
    subscriptionId: get("m_payment_id"),
    token: get("token"),
    amountGross: get("amount_gross"),
    billingDate: get("billing_date"),
  };
}
