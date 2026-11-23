# UI polish: screenshots and how to redo them

- `before/` is the app as it was on `main`. `after/` is branch `ui-polish`.
- Files are named `<who>-<page>-<desktop|mobile>.png` (1440x900 and 390x844).
  `staff` is an ASC staff login, `client` a client with most modules,
  `client-new` a client whose site is not live yet. `*-menu-mobile.png` is the
  mobile navigation sheet.
- `report.json` lists, per shot: horizontal scroll, sidebar scroll, console
  errors, and mobile tap targets under 44px.

The data is invented. `scripts/ui-shots.mjs` answers the browser's Supabase
requests itself, so no real login or database is used.

```powershell
npm run dev
node scripts/ui-shots.mjs --out docs/ui-polish/after
node scripts/check-contrast.mjs
```

Known report noise: `/content` logs a duplicate-key warning in both `before`
and `after`. The fake backend returns the same section row for every insert.
Switches show 24px tall in the tap-target list; their touch area is 44px.
