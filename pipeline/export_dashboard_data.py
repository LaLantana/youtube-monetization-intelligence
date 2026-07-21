"""Export the 18 dashboard tables from the warehouse as the JSON files the
dashboard app reads (same format as the original Phase 1 MotherDuck export:
one JSON array per table, dates as plain strings).

Usage: python export_dashboard_data.py --db warehouse/ci.duckdb --out ../dashboard-live/src/data
"""
from __future__ import annotations

import argparse
from pathlib import Path

import duckdb

HERE = Path(__file__).resolve().parent
OUT_SCHEMA = "analytics"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(HERE / "warehouse" / "ci.duckdb"))
    ap.add_argument("--out", default=str(HERE.parent / "dashboard-live" / "src" / "data"))
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(args.db, read_only=True)
    tables = [r[0] for r in con.execute(
        "SELECT table_name FROM information_schema.tables "
        f"WHERE table_schema='{OUT_SCHEMA}' AND (table_name LIKE 'dashboard1_%' OR table_name LIKE 'dashboard2_%') "
        "ORDER BY 1"
    ).fetchall()]
    if len(tables) != 18:
        raise SystemExit(f"expected 18 dashboard tables, found {len(tables)}: {tables}")
    for t in tables:
        con.execute(
            f'COPY (SELECT * FROM "{OUT_SCHEMA}"."{t}") TO \'{out / (t + ".json")}\' (FORMAT JSON, ARRAY true)'
        )
        print(f"exported {t}")
    print(f"18 tables -> {out}")


if __name__ == "__main__":
    main()
