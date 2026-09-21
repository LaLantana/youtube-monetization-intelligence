"""Incremental YouTube enrichment step.

The hackathon's fetcher (read_youtube_video_enrichment) is stateless — on
Ascend, the platform's incremental materialization remembered what was already
enriched. This wrapper rebuilds that memory:

1. Load the accumulated enrichment store (parquet; falls back to the April
   seed on first ever run).
2. Read the current candidate list from the warehouse and drop videos the
   store already settled ('processed' = done; 'missing_response' = video is
   gone from YouTube, retrying is pointless; 'failed_request' = transient,
   retry).
3. Call the original component verbatim to fetch the next budget-capped slice.
4. Merge results into the store (one row per video, 'processed' wins) and
   save it. The daily workflow persists the store as a GitHub release asset.

Without YOUTUBE_API_KEY set, it skips fetching but still writes the store, so
the pipeline's stub input always exists.

Usage: python enrich_step.py --db warehouse/ci.duckdb --store raw_data/enrichment_store.parquet
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import duckdb
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "ascend_shim"))

SEED = HERE / "seeds" / "april_enrichment.parquet"
DONT_RETRY = {"processed", "missing_response"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(HERE / "warehouse" / "ci.duckdb"))
    ap.add_argument("--store", default=str(HERE / "raw_data" / "enrichment_store.parquet"))
    args = ap.parse_args()

    store_path = Path(args.store)
    source = store_path if store_path.exists() else SEED
    store = pd.read_parquet(source)
    print(f"store loaded from {source.name}: {len(store)} rows "
          f"({(store['status'] == 'processed').sum()} processed)")

    con = duckdb.connect(args.db, read_only=True)
    candidates = con.execute("SELECT * FROM analytics.youtube_enrichment_candidates").fetchdf()
    done = set(store.loc[store["status"].isin(DONT_RETRY), "video_id"].astype(str))
    todo = candidates[~candidates["video_id"].astype(str).isin(done)]
    print(f"candidates: {len(candidates)} total, {len(todo)} not yet enriched")

    if not os.environ.get("YOUTUBE_API_KEY"):
        print("YOUTUBE_API_KEY not set — skipping fetch, store unchanged")
    elif todo.empty:
        print("nothing to enrich — backfill complete")
    else:
        from runner import load_py_component  # loads via the ascend shim
        from ascend.application.context import ComponentExecutionContext

        comp = load_py_component(HERE / "components" / "read_youtube_video_enrichment.py")
        new_rows = comp.fn(todo.reset_index(drop=True), ComponentExecutionContext())
        print(f"fetched {len(new_rows)} result rows "
              f"({(new_rows['status'] == 'processed').sum()} processed)")
        store = pd.concat([store, new_rows], ignore_index=True)

    # One row per video: prefer 'processed', then the most recent attempt.
    store["_rank"] = (store["status"] == "processed").astype(int)
    store = (
        store.sort_values(["_rank", "processed_at"], ascending=[False, False])
        .drop_duplicates("video_id", keep="first")
        .drop(columns="_rank")
        .reset_index(drop=True)
    )

    store_path.parent.mkdir(parents=True, exist_ok=True)
    store.to_parquet(store_path, index=False)
    processed = (store["status"] == "processed").sum()
    print(f"store saved: {len(store)} rows, {processed} processed "
          f"({processed / max(len(candidates), 1):.1%} of current candidates)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
