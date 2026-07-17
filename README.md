# YouTube Trending Monetization Intelligence

Turning **5 million rows of YouTube trending data across 113 countries** into an interactive dashboard about *what content earns* — not just what performs. Built at an agentic data-engineering hackathon, and rebuilt to run on its own after the original platform shut down.

### 🔗 Live dashboard
**https://scintillating-mooncake-72d47d.netlify.app/**

---

## What this is

A data pipeline and dashboard that ingest daily YouTube trending data, enrich it, and transform it into **monetization intelligence** — which categories, formats, topics, and timing patterns consistently produce the highest estimated revenue, and how those patterns shift over time.

It was designed as the analytical foundation for a future **autonomous YouTube content agent**: a system that could one day decide what to post, and where, based on live market conditions.

## The data

| | |
|---|---|
| **Source** | Kaggle — [`asaniczka/trending-youtube-videos-113-countries`](https://www.kaggle.com/datasets/asaniczka/trending-youtube-videos-113-countries) |
| **Scale** | ~5,000,000 rows · 113 countries · daily snapshots |
| **Range** | October 2023 – April 2026 |
| **License** | Open Data Commons Attribution (ODC-By) v1.0 |
| **Enrichment** | YouTube Data API (category, duration) · Google Trends |

## What it measures

The pipeline builds a set of original analytical frameworks from the raw data:

- **Engagement tiers** — percentile-based (Mega Viral / Viral / Trending / Emerging).
- **Engagement quality score** — how *deeply* an audience interacts, not just how many saw it.
- **Viral fingerprints** — four movement patterns (**Rocket**, **Slow Burner**, **Evergreen**, **Flash**), with thresholds derived from the data's own distributions rather than guessed.
- **Monetization quadrants** — a two-axis view of reach × engagement (**Premium / Passive / Niche Gem / Skip**).
- **Estimated revenue** — an RPM-and-duration model that reframes "what performs well" as "what earns well."
- **Platform Health Index** — market conditions over time: volatility, channel concentration, language diversity, and barrier-to-entry.

The dashboard presents these across eight scrolling sections, from an executive KPI snapshot through timing, viral, topic, category, international, and threshold-evolution views.

## Current state & known limitations

This is an honest MVP, and the dashboard says so where it matters:

- **The market-analytics sections are real** — platform health, viral fingerprints, country/diversity trends, and time-series benchmarks are computed from the full dataset.
- **The category & revenue figures are illustrative.** The YouTube Data API enrichment (which supplies each video's category and duration) was validated but not yet run at scale, so most videos fall back to an "Uncategorized" default. Short-form vs. long-form separation depends on the same enrichment and is therefore incomplete (completing it is Phase 3 — see Roadmap).
- **The live site is a static snapshot** of the data as of ~April 2026. Making it refresh daily from Kaggle is the next phase (see Roadmap).

## How it was built — and revived

**Built** during a hackathon on **Ascend.io**, an agentic data-engineering platform, working with its AI agent ("Otto") to plan and construct a ~50-component pipeline (SQL + Python) feeding a React dashboard. The full methodology — dataset vetting, threshold reasoning, and the prompt-engineering approach — is documented in:

- [`Ascend-Hackathon-Process.md`](Ascend-Hackathon-Process.md) — the plan written before the build.
- [`Hackathon-Process Summary.md`](Hackathon-Process%20Summary.md) — what actually happened, obstacles and all.

**Revived** after Ascend shut down. The dashboards had been welded to Ascend's platform (they fetched data through a function the platform injected at runtime). To bring it back:

1. The computed data was exported out of MotherDuck into static JSON snapshots.
2. The dashboard was rebuilt as a **standalone React app** ([`dashboard-live/`](dashboard-live/)), with a small shim replacing the platform's data-fetch function.
3. It was compiled to a static site and deployed to Netlify.

## Repo guide

This folder is the Ascend community template repo *plus* the hackathon project layered on top. The parts that are **mine**:

| Path | What it is |
|---|---|
| [`dashboard-live/`](dashboard-live/) | The standalone, deployable dashboard app (the live site) |
| `projects/default/fabric/flows/youtube_trending_intelligence/` | The ~50-component data pipeline |
| `projects/default/fabric/applications/` | The original dashboard source (React `.tsx`) |
| `dashboard_data/` | The exported data snapshots powering the live site |
| `*.md` process docs | The plan and the build write-up |

Everything else under `projects/` (`minimal`, `default/*` other than `fabric`, `ottos-expeditions`, `dbt`) is **Ascend's template scaffolding**, kept for context.

## Roadmap

- **Phase 1 — Live showcase ✅** (this — dashboard back online as a static snapshot).
- **Phase 2 — Daily & accurate (Dashboard 1)** — port the pipeline off Ascend, plug directly into the Kaggle source with an automated daily refresh, and run the YouTube enrichment at scale so the category and revenue numbers become fully real.
- **Phase 3 — Short vs. long form (Dashboard 2)** — finish the second dashboard once Phase 2's enrichment supplies video durations (the data it depends on).
- **Later (unscheduled)** — search-interest signals (Google Trends). The original integration was a validated stub that no chart ever consumed, so it was dropped from Phase 2; if a search-interest chart is designed in future, this would be rebuilt on a sturdier source than the unofficial `pytrends` scraper.

## Tech

React · Recharts · Vite · TypeScript · Tailwind · DuckDB / MotherDuck · dbt-style SQL · Python (pandas, Ibis)

---

*Data: YouTube trending dataset by asaniczka on Kaggle, used under ODC-By v1.0.*
