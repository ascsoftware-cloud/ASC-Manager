#!/usr/bin/env node
/**
 * Screenshot every route as a client and as staff, offline.
 *
 * The app signs in through Supabase, and nobody should hand a script a real
 * login. So this answers the browser's Supabase requests itself with the fake
 * workspace in ui-shots-fixtures.mjs: no real session, no network call to the
 * real project. It needs the dev server running (`npm run dev`).
 *
 *   node scripts/ui-shots.mjs --out docs/ui-polish/before
 *   node scripts/ui-shots.mjs --out docs/ui-polish/after --only staff
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { toCrossJSON } from "seroval";
import { loadLocalEnv } from "./load-local-env.mjs";
import { personas, staffAccounts, tablesFor } from "./ui-shots-fixtures.mjs";

loadLocalEnv();

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const BASE = flag("base", "http://127.0.0.1:8080");
const OUT = flag("out", "docs/ui-polish/after");
const ONLY = flag("only", "");
const ROUTE = flag("route", "");
const DEBUG = args.includes("--debug");
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
if (!SUPABASE_URL) {
  console.error("Need VITE_SUPABASE_URL in .env.local so the cookie name matches.");
  process.exit(1);
}
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];

const SIZES = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const ROUTES = {
  staff: ["/", "/clients", "/sites", "/monitors", "/incidents", "/renewals", "/requests", "/visitors", "/admin", "/clients/00000000-0000-4000-8000-0000000000b2", "/clients/00000000-0000-4000-8000-0000000000b2?tab=modules", "/clients/00000000-0000-4000-8000-0000000000b2?tab=logins", "/clients/00000000-0000-4000-8000-0000000000b2?tab=billing", "/clients/00000000-0000-4000-8000-0000000000b1?tab=billing", "/privacy", "/terms"],
  client: ["/", "/content", "/store", "/calendar", "/bookings", "/enquiries", "/visitors", "/business", "/billing", "/team", "/requests", "/renewals", "/media"],
  "client-new": ["/"],
};

const b64url = (value) => Buffer.from(value).toString("base64url");

function fakeSession(persona, table) {
  const p = personas[persona];
  const profile = table.profiles.find((r) => r.user_id === p.userId);
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 6;
  const jwt = [
    b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    b64url(JSON.stringify({ sub: p.userId, role: "authenticated", exp })),
    b64url("fake-signature"),
  ].join(".");
  return {
    access_token: jwt,
    token_type: "bearer",
    expires_in: 60 * 60 * 6,
    expires_at: exp,
    refresh_token: "fake-refresh",
    user: {
      id: p.userId,
      aud: "authenticated",
      role: "authenticated",
      email: profile.email,
      app_metadata: {},
      user_metadata: {
        role: profile.role,
        name: profile.name,
        tenant_id: profile.tenant_id,
      },
      created_at: new Date().toISOString(),
    },
  };
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

async function installFakeBackend(context, persona) {
  const table = tablesFor(persona);
  await context.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(req.url());
    const rest = url.pathname.match(/^\/rest\/v1\/([a-z_]+)/);
    if (rest) {
      let rows = table[rest[1]] ?? [];
      const filter = url.searchParams.get("user_id");
      if (filter?.startsWith("eq.")) rows = rows.filter((r) => r.user_id === filter.slice(3));
      return route.fulfill({
        status: 200,
        headers: { ...CORS, "content-type": "application/json" },
        body: JSON.stringify(rows),
      });
    }
    return route.fulfill({ status: 404, headers: CORS, body: "{}" });
  });
  // Server functions. The URL is base64 of {file, export}; answer the staff list.
  await context.route("**/_serverFn/**", async (route) => {
    const body = route.request().postData() ?? "";
    if (DEBUG) console.log("serverFn", route.request().url().slice(-80), body.slice(0, 120));
    const id = route.request().url().split("/_serverFn/")[1] ?? "";
    let name = "";
    try {
      name = Buffer.from(id.split("?")[0], "base64url").toString();
    } catch {
      /* not base64 */
    }
    if (name.includes("listStaffFn")) {
      return route.fulfill({
        status: 200,
        headers: { "content-type": "application/json", "x-tss-serialized": "true" },
        body: JSON.stringify(toCrossJSON({ result: staffAccounts, context: {} }, { refs: new Map(), plugins: [] })),
      });
    }
    if (name.includes("resolvePaymentLinkFn")) {
      const view = {
        state: "ready",
        clientName: "Kloof View Guest House",
        amountZar: 509,
        item: "Starter package: hosting and maintenance, plus database",
        action: "https://sandbox.payfast.co.za/eng/process",
        fields: [],
      };
      return route.fulfill({
        status: 200,
        headers: { "content-type": "application/json", "x-tss-serialized": "true" },
        body: JSON.stringify(toCrossJSON({ result: view, context: {} }, { refs: new Map(), plugins: [] })),
      });
    }
    return route.continue();
  });
}

async function seedSession(context, persona) {
  const table = tablesFor(persona);
  const session = fakeSession(persona, table);
  await context.addCookies([
    {
      name: `sb-${PROJECT_REF}-auth-token`,
      value: `base64-${b64url(JSON.stringify(session))}`,
      url: BASE,
    },
  ]);
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("asc-cookies-v1", "1");
    } catch {
      /* storage unavailable */
    }
  });
}

const slug = (route) =>
  route === "/" ? "home" : route.replace(/^\//, "").replace(/00000000-0000-4000-8000-0000000000b[12]/, (m) => (m.endsWith("b1") ? "detail-b1" : "detail")).replace(/[/?=]/g, "-");

async function shoot(browser, persona, size, report) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    isMobile: size.name === "mobile",
    hasTouch: size.name === "mobile",
  });
  await seedSession(context, persona);
  await installFakeBackend(context, persona);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  for (const route of ROUTES[persona]) {
    if (ROUTE && route.replace(/^[/]/, "") !== ROUTE.replace(/^[/]/, "")) continue;
    errors.length = 0;
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(700);
    const file = `${persona}-${slug(route)}-${size.name}.png`;
    await page.screenshot({ path: join(OUT, file), fullPage: true });
    const metrics = await page.evaluate(() => {
      const nav = document.querySelector("aside nav");
      const scroller = nav?.closest("[class*='overflow-y']") ?? nav;
      return {
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        sidebarScrolls: scroller ? scroller.scrollHeight > scroller.clientHeight + 1 : false,
        title: document.querySelector("h1")?.textContent ?? "",
        smallTargets: [...document.querySelectorAll("button, a[href], input:not([type=hidden]), select")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const inText = el.closest("p, footer, .sr-only") || el.matches(".sr-only, [type=file]");
            return r.width > 0 && r.height > 0 && r.height < 44 && !inText && !el.closest("[aria-hidden=true]");
          })
          .slice(0, 8)
          .map((el) => `${el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}:${Math.round(el.getBoundingClientRect().height)}`),
      };
    });
    report.push({ persona, route, size: size.name, file, ...metrics, errors: [...errors] });
    console.log(`${persona} ${route} ${size.name}`);
  }
  if (size.name === "mobile" && persona !== "client-new") {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" }).catch(() => {});
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(600);
    const file = `${persona}-menu-mobile.png`;
    await page.screenshot({ path: join(OUT, file) });
    const menu = await page.evaluate(() => {
      const nav = document.querySelector("[role=dialog] nav");
      const body = nav?.closest("[role=dialog]");
      const items = [...(body?.querySelectorAll("a[href], button") ?? [])].filter((el) => !el.closest(".sr-only") && el.getAttribute("aria-label") !== "Close");
      return {
        sheetOverflow: nav ? nav.scrollHeight > nav.clientHeight + 1 : null,
        smallTargets: items.filter((el) => el.getBoundingClientRect().height < 44).length,
        items: items.length,
      };
    });
    report.push({ persona, route: "menu", size: "mobile", file, ...menu });
    console.log(persona, "menu", JSON.stringify(menu));
  }
  await context.close();
}

async function shootLogin(browser, report) {
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    const page = await context.newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(500);
    const file = `login-${size.name}.png`;
    await page.screenshot({ path: join(OUT, file), fullPage: true });
    report.push({ persona: "signed-out", route: "/", size: size.name, file });
    await installFakeBackend(context, "staff");
    await page.goto(`${BASE}/pay/abcdefghijklmnopqrstuvwxyz0123456789`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(500);
    const payFile = `pay-link-${size.name}.png`;
    await page.screenshot({ path: join(OUT, payFile), fullPage: true });
    report.push({ persona: "signed-out", route: "/pay/:token", size: size.name, file: payFile });
    await context.close();
  }
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: flag("channel", "msedge") });
const report = [];
if (!ONLY || ONLY === "login") await shootLogin(browser, report);
for (const persona of Object.keys(ROUTES)) {
  if (ONLY && ONLY !== persona) continue;
  for (const size of SIZES) await shoot(browser, persona, size, report);
}
await browser.close();
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.overflowX || (r.errors && r.errors.length));
console.log(`\n${report.length} shots, ${bad.length} with horizontal scroll or console errors. See ${OUT}/report.json`);
