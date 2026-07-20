"""Generate a small synthetic raw table so the pipeline DAG can be smoke-tested
without the real 5M-row dataset. Shapes mirror the Kaggle source exactly —
including the source's misspelled `langauge` column, which the pipeline
deliberately preserves.

Usage: python make_sample_data.py --db warehouse/pipeline.duckdb [--rows 3000]
"""
from __future__ import annotations

import argparse
import datetime as dt
import random
from pathlib import Path

import duckdb
import pandas as pd

RAW_SCHEMA = "YouTube Trending Videos"

COUNTRIES = ["US", "GB", "IN", "BR", "DE", "JP", "KR", "MX", "FR", "CA"]
LANGS = ["en", "en", "es", "pt", "de", "ja", "ko", None, "fr", "hi"]
TAGSETS = [
    "music|pop|official", "gaming,letsplay,walkthrough", "news|politics",
    "comedy|sketch", "tutorial,howto,diy", "vlog|daily", None,
    "sports|highlights", "food,recipe,cooking", "science|space",
]


def make_rows(n: int, seed: int = 7) -> pd.DataFrame:
    rng = random.Random(seed)
    start = dt.date(2023, 10, 1)
    months = 31  # matches the real Oct-2023..Apr-2026 span
    videos = [f"vid{i:05}" for i in range(max(50, n // 20))]
    rows = []
    for i in range(n):
        vid = rng.choice(videos)
        month_off = rng.randrange(months)
        snap = (start + dt.timedelta(days=30 * month_off + rng.randrange(28)))
        publish = snap - dt.timedelta(days=rng.choice([0, 1, 2, 5, 30, 200]))
        views = int(10 ** rng.uniform(3, 7.5))
        rows.append({
            "snapshot_date": snap,
            "video_id": vid,
            "channel_id": f"ch{hash(vid) % 500:03}",
            "channel_name": f"Channel {hash(vid) % 500:03}",
            "title": f"Sample video {vid} — {rng.choice(['amazing', 'daily', 'official', 'live'])}",
            "daily_rank": rng.randint(1, 50),
            "daily_movement": rng.randint(-20, 20),
            "weekly_movement": rng.randint(-40, 40),
            "view_count": views,
            "like_count": int(views * rng.uniform(0.001, 0.08)),
            "comment_count": int(views * rng.uniform(0.0001, 0.01)),
            "video_tags": rng.choice(TAGSETS),
            "publish_date": publish,
            "country": rng.choice(COUNTRIES),
            "langauge": rng.choice(LANGS),  # sic — the source column is misspelled
            "description": f"Description text for {vid}.",
        })
    return pd.DataFrame(rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(Path(__file__).parent / "warehouse" / "pipeline.duckdb"))
    ap.add_argument("--rows", type=int, default=3000)
    args = ap.parse_args()

    df = make_rows(args.rows)
    con = duckdb.connect(args.db)
    con.execute(f'CREATE SCHEMA IF NOT EXISTS "{RAW_SCHEMA}"')
    con.execute(f'CREATE OR REPLACE TABLE "{RAW_SCHEMA}".trending_videos AS SELECT * FROM df')
    n = con.execute(f'SELECT count(*) FROM "{RAW_SCHEMA}".trending_videos').fetchone()[0]
    print(f"raw table ready: {n} rows, {df.video_id.nunique()} unique videos")


if __name__ == "__main__":
    main()
