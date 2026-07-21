# Pipeline (ported off Ascend)

The original hackathon pipeline was built on Ascend.io, which has shut down.
This folder runs the **same 49 components, byte-for-byte unmodified**, on
[DuckDB](https://duckdb.org/) — no platform, no cloud account, no cost.

## How the port works

Rather than rewriting the components, two small pieces recreate the
environment they expect:

| Piece | Role |
|---|---|
| `ascend_shim/` | Impersonates Ascend's Python toolkit (`ascend.resources`, context, logging). The `@transform`/`@read` decorators just record each component's declared inputs and tests; secrets come from environment variables instead of Ascend vaults. |
| `runner.py` | A ~200-line DAG runner. Renders the dbt-style SQL (`{{ ref(...) }}`, `{{ with_test(...) }}`), imports the Python components through the shim, figures out dependency order, materializes every step into DuckDB, and enforces the components' embedded data tests. |

The Python components are written with [ibis](https://ibis-project.org/),
whose native backend is DuckDB — which is why they run unchanged.

`components/` holds verbatim copies of the originals (from
`../projects/default/fabric/flows/youtube_trending_intelligence/`), minus the
two Google Trends components (dead ends — nothing consumed their output; see
the root README's roadmap).

## Running it

```bash
python3 -m venv ../.venv && ../.venv/bin/pip install -r requirements.txt

# Smoke test on synthetic data:
../.venv/bin/python make_sample_data.py
../.venv/bin/python runner.py \
  --stub read_youtube_video_enrichment \
  --exclude inspect_youtube_videos_payload

# Golden test (needs the real April raw export in raw_data/, not in git):
../.venv/bin/python load_raw.py --db warehouse/golden.duckdb
../.venv/bin/python runner.py --db warehouse/golden.duckdb \
  --stub-parquet read_youtube_video_enrichment=raw_data/april_enrichment.parquet \
  --exclude inspect_youtube_videos_payload
../.venv/bin/python golden_test.py --db warehouse/golden.duckdb
```

- `--stub` replaces a component with an empty table of the right shape
  (used when no `YOUTUBE_API_KEY` is set).
- `--stub-parquet name=path` replaces a component with a saved snapshot —
  the golden test uses the actual April enrichment state.
- `golden_test.py` compares the 18 dashboard tables against
  `../dashboard_data/*.json`, the exports powering the live dashboard.

## Status — port verified against the April data

The full 5,013,692-row April dataset was re-exported from MotherDuck and run
through the ported pipeline (≈13 min on a laptop). All 49 components built
and passed their embedded data tests. Golden-test result vs the exports
powering the live dashboard:

- **13 of 18 dashboard tables match exactly** — to the decimal.
- **5 tables differ by ~0.1–0.5%** (e.g. headline health index 33.92 vs
  33.91). Root cause verified: the original SQL's window functions
  (`FIRST_VALUE`/`ROW_NUMBER` ordered by `snapshot_date` only) hit ties —
  a video has up to 112 same-day rows, one per country — and which row wins
  a tie is arbitrary on any engine, including the original platform. Two
  runs on Ascend would have differed the same way. No logic differences
  were found; both sides contain identical group structures.

## Determinism hardening (2026-07-21)

The tie-breaking gap was closed — the first deliberate change to the
original components (originals under `../projects/` remain untouched as the
historical record). All 22 window orderings across 14 SQL components now end
in a unique column (`country`, `channel_id`, `topic_cluster`,
category/quadrant/track names), so ranking and first-value picks are no
longer arbitrary among tied rows.

Verified by running the full pipeline twice on the 5M-row April data and
comparing all 49 output tables:

- Every count, category, classification, and month is **identical** between
  runs. The worst floating-point difference across all 18 dashboard tables
  is **3.4×10⁻¹⁴** (parallel-summation noise, invisible at any displayed
  precision). The only differing column anywhere is a "computed at" run
  timestamp.
- Golden test vs April: 12/18 tables still match exactly; the 6 that differ
  do so only where April's runs made arbitrary tie picks that are now fixed
  deterministically (metric values match; tied ranks settle differently).

Note for CI: a full run materializes ~130 GB of intermediate tables
(every component persists all columns, Ascend-style). Fine on a laptop as a
one-off; the scheduled GitHub Actions run (14 GB disk) will need a slimmer
materialization mode — planned for the ingestion/automation stages.

Next (per the root roadmap): fresh Kaggle ingestion, YouTube enrichment at
scale, and a scheduled GitHub Actions run feeding the live dashboard.
Known logic observation (unchanged, on the backlog): the flash-fingerprint
window `min_daily_movement_next_3_days` looks at the next 3 *rows*, which
with per-country interleaving is usually the same day, not 3 days.
