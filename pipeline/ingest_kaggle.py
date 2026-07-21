"""Stage 2 ingestion: load the (already-downloaded) Kaggle trending-videos CSV
into the warehouse under the schema/table the pipeline expects, keeping only
the columns the pipeline uses.

The pipeline's source contract is the 17 columns of the April MotherDuck
table (including the dataset's own `langauge` misspelling, which the
pipeline deliberately preserves and corrects downstream).

Usage: python ingest_kaggle.py --db warehouse/fresh.duckdb --csv raw_data/trending_yt_videos_113_countries.csv
"""
from __future__ import annotations

import argparse
from pathlib import Path

import duckdb

RAW_SCHEMA = "YouTube Trending Videos"
HERE = Path(__file__).resolve().parent

EXPECTED = [
    "snapshot_date", "video_id", "channel_id", "channel_name", "title",
    "daily_rank", "daily_movement", "weekly_movement", "view_count",
    "like_count", "comment_count", "video_tags", "publish_date", "country",
    "langauge", "description",
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(HERE / "warehouse" / "fresh.duckdb"))
    ap.add_argument("--csv", default=str(HERE / "raw_data" / "trending_yt_videos_113_countries.csv"))
    args = ap.parse_args()

    con = duckdb.connect(args.db)
    cols = [r[0] for r in con.execute(
        "SELECT column_name FROM (DESCRIBE SELECT * FROM read_csv_auto(?, sample_size=100000))",
        [args.csv],
    ).fetchall()]
    missing = [c for c in EXPECTED if c not in cols]
    extra = [c for c in cols if c not in EXPECTED]
    print(f"CSV columns: {len(cols)}; missing vs contract: {missing or 'none'}; extra (ignored): {extra or 'none'}")
    if missing:
        raise SystemExit(f"schema drift: dataset no longer provides {missing}")

    collist = ", ".join(f'"{c}"' for c in EXPECTED)
    con.execute(f'CREATE SCHEMA IF NOT EXISTS "{RAW_SCHEMA}"')
    con.execute(
        f'CREATE OR REPLACE TABLE "{RAW_SCHEMA}".trending_videos AS '
        f"SELECT {collist} FROM read_csv_auto(?, sample_size=100000)",
        [args.csv],
    )
    n, dmin, dmax = con.execute(
        f'SELECT count(*), min(snapshot_date), max(snapshot_date) FROM "{RAW_SCHEMA}".trending_videos'
    ).fetchone()
    print(f"loaded {n:,} rows | snapshot range {dmin} → {dmax}")


if __name__ == "__main__":
    main()
