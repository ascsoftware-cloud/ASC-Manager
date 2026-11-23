import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  amountsMatch,
  apiHeaders,
  buildCheckout,
  hashLinkToken,
  ipAllowed,
  newLinkToken,
  paramString,
  payfastEncode,
  payfastMode,
  processUrl,
  sign,
  verifyItnSignature,
  type Pair,
} from "./payfast.ts";
import { createItnService, type ItnStore, type PlanRow } from "./payfast-itn-service.ts";

const PASS = "a-test-passphrase";
const md5 = (s: string) => createHash("md5").update(s).digest("hex");

describe("signing", () => {
  it("encodes like PHP urlencode", () => {
    assert.equal(payfastEncode("john@example.com"), "john%40example.com");
    assert.equal(payfastEncode(" Test Item "), "Test+Item");
    assert.equal(payfastEncode("a!~'()*"), "a%21%7E%27%28%29%2A");
  });

  it("signs the fields in the order given, skipping empty ones, then the passphrase", () => {
    const pairs: Pair[] = [
      ["merchant_id", "10000100"],
      ["merchant_key", "46f0cd694581a"],
      ["name_first", ""],
      ["amount", "10.00"],
      ["item_name", "Test Item"],
    ];
    const expected = md5(
      "merchant_id=10000100&merchant_key=46f0cd694581a&amount=10.00&item_name=Test+Item&passphrase=a-test-passphrase",
    );
    assert.equal(sign(pairs, PASS), expected);
    assert.equal(sign(pairs, ""), md5(paramString(pairs)));
  });

  it("changing the order changes the signature", () => {
    const a: Pair[] = [
      ["a", "1"],
      ["b", "2"],
    ];
    const b: Pair[] = [
      ["b", "2"],
      ["a", "1"],
    ];
    assert.notEqual(sign(a, PASS), sign(b, PASS));
  });
});

describe("checkout", () => {
  const input = {
    merchantId: "10000100",
    merchantKey: "46f0cd694581a",
    passphrase: PASS,
    mode: "sandbox" as const,
    returnUrl: "https://manager.example/billing",
    cancelUrl: "https://manager.example/billing",
    notifyUrl: "https://manager.example/api/payfast/itn",
    subscriptionId: "sub-1",
    amountZar: 450,
    itemName: "Monthly hosting and support",
    emailAddress: "owner@example.com",
    billingDate: "2026-12-01",
  };

  it("asks for a monthly card subscription with no end date", () => {
    const { action, fields } = buildCheckout(input);
    const get = (k: string) => fields.find(([key]) => key === k)?.[1];
    assert.equal(action, "https://sandbox.payfast.co.za/eng/process");
    assert.equal(get("subscription_type"), "1");
    assert.equal(get("frequency"), "3");
    assert.equal(get("cycles"), "0");
    assert.equal(get("amount"), "450.00");
    assert.equal(get("recurring_amount"), "450.00");
    assert.equal(get("m_payment_id"), "sub-1");
  });

  it("signs what it sends, and the signature leaves out nothing it sends", () => {
    const { fields } = buildCheckout(input);
    assert.equal(fields.at(-1)?.[0], "signature");
    assert.equal(verifyItnSignature(fields, PASS), true);
    assert.equal(verifyItnSignature(fields, "wrong"), false);
  });

  it("uses the live address only in live mode", () => {
    assert.equal(payfastMode("live"), "live");
    assert.equal(payfastMode(undefined), "sandbox");
    assert.equal(payfastMode("anything else"), "sandbox");
    assert.match(processUrl("live"), /^https:\/\/www\.payfast\.co\.za/);
  });
});

describe("small checks", () => {
  it("compares amounts to the cent", () => {
    assert.equal(amountsMatch("450.00", 450), true);
    assert.equal(amountsMatch("449.99", 450), false);
    assert.equal(amountsMatch("abc", 450), false);
  });
  it("only allows listed IPs", () => {
    assert.equal(ipAllowed("::ffff:197.97.145.144", ["197.97.145.144"]), true);
    assert.equal(ipAllowed("1.2.3.4", ["197.97.145.144"]), false);
    assert.equal(ipAllowed("", ["197.97.145.144"]), false);
  });
  it("makes long random link tokens and stores only their hash", () => {
    const a = newLinkToken();
    assert.ok(a.length >= 40);
    assert.notEqual(a, newLinkToken());
    assert.equal(hashLinkToken(a).length, 64);
    assert.notEqual(hashLinkToken(a), a);
  });
  it("signs API calls from the sorted headers", () => {
    const h = apiHeaders("10000100", PASS, new Date("2026-11-23T10:00:00Z"));
    assert.equal(h.timestamp, "2026-11-23T10:00:00");
    assert.equal(
      h.signature,
      md5(
        "merchant-id=10000100&passphrase=a-test-passphrase&timestamp=2026-11-23T10%3A00%3A00&version=v1",
      ),
    );
  });
});

function itnPairs(over: Record<string, string> = {}, passphrase = PASS): Pair[] {
  const base: Record<string, string> = {
    m_payment_id: "sub-1",
    pf_payment_id: "1089250",
    payment_status: "COMPLETE",
    item_name: "Monthly hosting and support",
    amount_gross: "450.00",
    amount_fee: "-10.35",
    token: "tok-123",
    billing_date: "2026-12-01",
    ...over,
  };
  const pairs = Object.entries(base) as Pair[];
  return [...pairs, ["signature", sign(pairs, passphrase)]];
}

function fakeStore(plan: PlanRow | null = null, seen: string[] = []) {
  const calls: string[] = [];
  const store: ItnStore = {
    async findSubscription(id) {
      return plan && plan.id === id ? plan : null;
    },
    async paymentSeen(id) {
      return seen.includes(id);
    },
    async recordPayment(p) {
      calls.push(`payment:${p.pfPaymentId}:${p.status}:${p.amountZar}`);
      seen.push(p.pfPaymentId);
    },
    async update(id, patch) {
      calls.push(`update:${id}:${patch.status}:${patch.payfastToken ?? ""}`);
    },
  };
  return { store, calls };
}

const plan: PlanRow = { id: "sub-1", tenantId: "t-1", amountZar: 450, status: "awaiting" };

function run(opts: {
  pairs: Pair[];
  source?: boolean;
  confirms?: boolean;
  seen?: string[];
  plan?: PlanRow | null;
}) {
  const { store, calls } = fakeStore(opts.plan === undefined ? plan : opts.plan, opts.seen ?? []);
  const svc = createItnService({
    passphrase: PASS,
    store,
    confirmWithPayfast: async () => opts.confirms ?? true,
    now: () => new Date("2026-11-23T10:00:00Z"),
  });
  return { result: svc.handle(opts.pairs, opts.source ?? true), calls };
}

describe("payment notifications", () => {
  it("records a good payment and switches the plan on", async () => {
    const { result, calls } = run({ pairs: itnPairs() });
    assert.equal((await result).status, 200);
    assert.deepEqual(calls, ["payment:1089250:complete:450", "update:sub-1:active:tok-123"]);
  });

  it("refuses a bad signature and changes nothing", async () => {
    const { result, calls } = run({ pairs: itnPairs({}, "someone-elses-passphrase") });
    assert.equal((await result).status, 400);
    assert.deepEqual(calls, []);
  });

  it("refuses a tampered amount even with a valid signature from us", async () => {
    const { result, calls } = run({ pairs: itnPairs({ amount_gross: "1.00" }) });
    assert.equal((await result).status, 400);
    assert.deepEqual(calls, []);
  });

  it("refuses anything that did not come from PayFast", async () => {
    const { result, calls } = run({ pairs: itnPairs(), source: false });
    assert.equal((await result).status, 403);
    assert.deepEqual(calls, []);
  });

  it("refuses a plan we do not have", async () => {
    const { result, calls } = run({ pairs: itnPairs({ m_payment_id: "other" }) });
    assert.equal((await result).status, 400);
    assert.deepEqual(calls, []);
  });

  it("refuses when PayFast does not confirm it", async () => {
    const { result, calls } = run({ pairs: itnPairs(), confirms: false });
    assert.equal((await result).status, 400);
    assert.deepEqual(calls, []);
  });

  it("ignores a notification it has already handled", async () => {
    const { result, calls } = run({ pairs: itnPairs(), seen: ["1089250"] });
    assert.equal((await result).status, 200);
    assert.deepEqual(calls, []);
  });

  it("flags a failed payment", async () => {
    const { result, calls } = run({
      pairs: itnPairs({ payment_status: "FAILED", pf_payment_id: "1089251" }),
    });
    assert.equal((await result).status, 200);
    assert.deepEqual(calls, ["payment:1089251:failed:450", "update:sub-1:failed:"]);
  });

  it("marks a cancelled subscription", async () => {
    const { result, calls } = run({ pairs: itnPairs({ payment_status: "CANCELLED" }) });
    assert.equal((await result).status, 200);
    assert.deepEqual(calls, ["update:sub-1:cancelled:"]);
  });
});
