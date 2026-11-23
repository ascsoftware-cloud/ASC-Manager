import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canStartPayment, linkExpiry, linkIsUsable } from "./billing-access.ts";
import { priceMonthlyPlan, type PlanChoice } from "./billing-plans.ts";

describe("who may set up a monthly payment", () => {
  it("lets an account admin", () => {
    assert.equal(canStartPayment({ role: "client", access: "admin", tenantId: "t1" }), true);
  });
  it("lets a staff login who was given Billing", () => {
    assert.equal(
      canStartPayment({
        role: "client",
        access: "staff",
        permissions: ["billing"],
        tenantId: "t1",
      }),
      true,
    );
  });
  it("refuses a staff login without Billing", () => {
    assert.equal(
      canStartPayment({ role: "client", access: "staff", permissions: ["store"], tenantId: "t1" }),
      false,
    );
  });
  it("refuses ASC staff, who use a payment link instead", () => {
    assert.equal(canStartPayment({ role: "operator", access: "admin", tenantId: null }), false);
  });
  it("refuses anyone without an account or role", () => {
    assert.equal(canStartPayment({ role: "client", access: "admin", tenantId: null }), false);
    assert.equal(canStartPayment({ role: undefined }), false);
  });
});

describe("monthly price list", () => {
  it("prices each package from the price list", () => {
    const want = { single: 210, starter: 359, standard: 420, scale: 510 } as const;
    for (const [choice, amount] of Object.entries(want)) {
      const r = priceMonthlyPlan({ choice: choice as PlanChoice, database: false });
      assert.equal(r.ok && r.amountZar, amount, choice);
    }
  });
  it("adds R150 a month for the database", () => {
    const r = priceMonthlyPlan({ choice: "starter", database: true });
    assert.equal(r.ok && r.amountZar, 509);
    assert.match(r.ok ? r.item : "", /Starter package.*database/);
  });
  it("ignores a custom amount when a package is chosen", () => {
    const r = priceMonthlyPlan({ choice: "single", database: false, customAmountZar: 1 });
    assert.equal(r.ok && r.amountZar, 210);
  });
  it("accepts a custom amount and rounds it to the cent", () => {
    const r = priceMonthlyPlan({ choice: "custom", database: false, customAmountZar: 449.999 });
    assert.equal(r.ok && r.amountZar, 450);
  });
  it("refuses a bad package, and bad or out-of-range custom amounts", () => {
    assert.equal(priceMonthlyPlan({ choice: "gold" as PlanChoice, database: false }).ok, false);
    for (const v of [undefined, NaN, 0, -5, 5, 1_000_000]) {
      assert.equal(
        priceMonthlyPlan({ choice: "custom", database: false, customAmountZar: v }).ok,
        false,
        String(v),
      );
    }
  });
});

describe("payment links", () => {
  it("expire after seven days", () => {
    const now = new Date("2026-11-23T10:00:00Z");
    const expires = linkExpiry(now);
    assert.equal(expires.toISOString(), "2026-11-30T10:00:00.000Z");
    assert.equal(linkIsUsable({ expiresAt: expires.toISOString() }, now), true);
    assert.equal(
      linkIsUsable({ expiresAt: expires.toISOString() }, new Date("2026-12-01T00:00:00Z")),
      false,
    );
    assert.equal(linkIsUsable(null, now), false);
  });
});

describe("server wiring", () => {
  const fns = readFileSync(new URL("./billing.ts", import.meta.url), "utf8");
  const server = readFileSync(new URL("./billing.server.ts", import.meta.url), "utf8");

  it("every server function loads the .server module", () => {
    const created = (fns.match(/createServerFn/g) ?? []).length - 1;
    const loaded = (fns.match(/import\("\.\/billing\.server"\)/g) ?? []).length;
    assert.equal(created, loaded);
  });

  it("staff-only actions check for staff first", () => {
    for (const name of ["setPlan", "createPaymentLink", "cancelSubscription"]) {
      const body = server.slice(server.indexOf(`export async function ${name}`));
      const firstLines = body.split("\n").slice(0, 8).join("\n");
      assert.match(firstLines, /requireOperatorAdmin\(input\.accessToken\)/, name);
    }
  });

  it("the client checkout checks the person's permission", () => {
    const body = server.slice(server.indexOf("export async function startCheckout"));
    assert.match(body.slice(0, 1800), /canStartPayment/);
  });

  it("setPlan prices the plan on the server from the price list", () => {
    const body = server.slice(server.indexOf("export async function setPlan"));
    assert.match(body.slice(0, 900), /priceMonthlyPlan/);
    assert.doesNotMatch(body.slice(0, 900), /input\.amountZar/);
  });

  it("the public payment link never returns client data beyond name and amount", () => {
    const body = server.slice(server.indexOf("export async function resolvePaymentLink"));
    const returns = body.slice(0, body.indexOf("/* ---"));
    assert.doesNotMatch(returns, /payfast_token|phone|address/);
  });
});
