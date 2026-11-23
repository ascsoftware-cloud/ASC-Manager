#!/usr/bin/env node
/**
 * WCAG AA contrast check for the colour pairs the UI actually uses.
 *   node scripts/check-contrast.mjs
 * Exits 1 if any pair is below its threshold (4.5 for text, 3 for UI edges).
 */
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const mix = (fg, bg, a) => {
  const c = (h, i) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(c(fg, i) * a + c(bg, i) * (1 - a)).toString(16).padStart(2, "0")).join("")}`;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const white = "#ffffff";
const client = "#f3f5f4";
const staff = "#f6f1e4";
const ink = "#14201a";
const muted = "#56635c";
const primary = "#166534";
const warn = "#8a5300";
const destructive = "#b42318";
const accent = "#edf2ee";
const brand = "#0b3d2e";
const brandText = "#f4ecd6";
const gold = "#c8ad72";

const text = [
  ["ink on white", ink, white],
  ["ink on client canvas", ink, client],
  ["ink on staff canvas", ink, staff],
  ["muted on white", muted, white],
  ["muted on client canvas", muted, client],
  ["muted on staff canvas", muted, staff],
  ["muted on active nav (accent)", muted, accent],
  ["ink on active nav (accent)", ink, accent],
  ["primary text on white", primary, white],
  ["primary text on client canvas", primary, client],
  ["primary text on staff canvas", primary, staff],
  ["white on primary button", white, primary],
  ["white on destructive", white, destructive],
  ["destructive text on white", destructive, white],
  ["warn text on white", warn, white],
  ["warn text on client canvas", warn, client],
  ["white on warn count badge", white, warn],
  ["ink on success tint", ink, mix(primary, white, 0.1)],
  ["ink on warn tint", ink, mix(warn, white, 0.15)],
  ["ink on destructive tint", ink, mix(destructive, white, 0.1)],
  ["ink on champagne premium tint", ink, "#f4ecd6"],
  ["ink on champagne setup banner", ink, "#f4ecd6"],
  ["muted on champagne setup banner", muted, "#f4ecd6"],
  ["brand-foreground on brand panel", brandText, brand],
  ["gold rule text on brand panel", gold, brand],
];
const ui = [
  ["input border on white", "#7d8984", white],
  ["input border on client canvas", "#7d8984", client],
];

let bad = 0;
for (const [name, fg, bg] of text) {
  const r = ratio(fg, bg);
  const ok = r >= 4.5;
  if (!ok) bad++;
  console.log(`${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}  ${name}`);
}
for (const [name, fg, bg] of ui) {
  const r = ratio(fg, bg);
  const ok = r >= 3;
  if (!ok) bad++;
  console.log(`${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}  ${name} (needs 3)`);
}
process.exit(bad ? 1 : 0);
