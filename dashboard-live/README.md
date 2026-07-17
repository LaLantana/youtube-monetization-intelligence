# dashboard-live

The standalone, deployable version of the **YouTube Trending Monetization Intelligence** dashboard.
(Project overview is in the [repo root README](../README.md).)

This is the original hackathon dashboard, rebuilt to run **without** the Ascend platform it was
created on. It's a plain React + Vite app that reads static data snapshots — no backend, no database,
no API keys.

## How it works

- **`src/Dashboard.tsx`** — the dashboard UI (the original hackathon `v3` component, unmodified).
- **`src/data/*.json`** — the data, exported once from MotherDuck (18 tables). This is a static
  snapshot (~April 2026), so the site works forever with no live connection.
- **`src/ascendShim.ts`** — the key piece. The dashboard was built to fetch data by calling
  `window.ascend.runQuery(sql)`, a function the Ascend web app injected at runtime. Ascend is gone,
  so this shim recreates that one function: it reads the table name (and `ORDER BY`) out of each SQL
  query and returns the matching JSON file.

## Run it locally

```bash
npm install
npm run dev      # → http://localhost:5173
```

## Build & deploy

```bash
npm run build    # → produces the dist/ folder
```

Then publish `dist/` to any static host. The current live site is on **Netlify** — to update it,
rebuild and drag the new `dist/` folder onto the site's **Deploys** tab.

## Notes

- Styling uses the **Tailwind Play CDN** (see `index.html`) for a zero-config setup. For a long-term
  production build, this could be swapped for a compiled Tailwind step.
- `npm run build` intentionally skips the TypeScript type-check step — the imported dashboard
  component was written for Ascend's runtime and has type references that don't resolve here, but it
  compiles and runs correctly.

## Refreshing the data (until Phase 2 automates it)

The snapshots in `src/data/` come from MotherDuck. To refresh them, re-export the `dashboard1_*` /
`dashboard2_*` tables to JSON, drop them into `src/data/`, then rebuild. Phase 2 will replace this
manual step with an automated daily pull from the live Kaggle source.

## Changelog

### 2026-07 — Phase 1 (revival)

- Rebuilt to run without the (now-defunct) Ascend platform and deployed to Netlify as a static site
  (see "How it works" above).
- **Section 7 chart polish:** concentration axis → percentages; volatility kept as a raw count (it's
  *average rank-change*, not a proportion, so a `%` would misrepresent it); Barrier-to-Entry Y-axis
  abbreviated (`2,800,000` → `2.8M`, precise value on hover). Both charts use clean 0-based axes with
  evenly-spaced ticks.
- Verified the remaining deferred cosmetic fixes from the hackathon notes were **already applied** in
  the `v3` dashboard (Section 4 colors/labels, Section 7 line colors, country table size, etc.) — see
  `../Hackathon-Process Summary.md` for the full reconciliation.
