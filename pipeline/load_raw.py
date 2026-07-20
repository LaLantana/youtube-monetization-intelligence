"""Load the exported raw trending_videos parquet into the warehouse database,
under the schema/table name the pipeline's first component expects.

Usage: python load_raw.py --db warehouse/golden.duckdb [--parquet raw_data/trending_videos.parquet]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import duckdb

RAW_SCHEMA = "YouTube Trending Videos"
HERE = Path(__file__).resolve().parent


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(HERE / "warehouse" / "golden.duckdb"))
    ap.add_argument("--parquet", default=str(HERE / "raw_data" / "trending_videos.parquet"))
    args = ap.parse_args()

    con = duckdb.connect(args.db)
    con.execute(f'CREATE SCHEMA IF NOT EXISTS "{RAW_SCHEMA}"')
    con.execute(
        f'CREATE OR REPLACE TABLE "{RAW_SCHEMA}".trending_videos AS SELECT * FROM read_parquet(?)',
        [args.parquet],
    )
    n = con.execute(f'SELECT count(*) FROM "{RAW_SCHEMA}".trending_videos').fetchone()[0]
    print(f"raw table loaded: {n:,} rows -> {args.db}")


if __name__ == "__main__":
    main()
