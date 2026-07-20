"""Golden test: compare the ported pipeline's 18 dashboard tables against the
JSON snapshots exported from MotherDuck during Phase 1 (dashboard_data/).

Run the pipeline on the ORIGINAL April raw data first; then this script proves
the port reproduces the exact numbers the live dashboard shows.

Usage: python golden_test.py --db warehouse/pipeline.duckdb [--tolerance 1e-6]
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import duckdb

HERE = Path(__file__).resolve().parent
GOLDEN_DIR = HERE.parent / "dashboard_data"
OUT_SCHEMA = "analytics"


def values_equal(a, b, tol: float) -> bool:
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, float) or isinstance(b, float):
        try:
            fa, fb = float(a), float(b)
        except (TypeError, ValueError):
            return str(a) == str(b)
        if math.isnan(fa) and math.isnan(fb):
            return True
        return math.isclose(fa, fb, rel_tol=tol, abs_tol=tol)
    return str(a) == str(b)


def compare_table(con: duckdb.DuckDBPyConnection, name: str, tol: float) -> list[str]:
    golden = json.loads((GOLDEN_DIR / f"{name}.json").read_text())
    cur = con.execute(f'SELECT * FROM "{OUT_SCHEMA}"."{name}"')
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    problems: list[str] = []
    if len(rows) != len(golden):
        problems.append(f"row count: pipeline={len(rows)} golden={len(golden)}")
    gcols = set(golden[0].keys()) if golden else set()
    if gcols and set(cols) != gcols:
        problems.append(f"columns differ: only-pipeline={sorted(set(cols)-gcols)} only-golden={sorted(gcols-set(cols))}")
        return problems

    for i, (g, p) in enumerate(zip(golden, rows)):
        for col in g:
            if not values_equal(p.get(col), g[col], tol):
                problems.append(f"row {i} col {col}: pipeline={p.get(col)!r} golden={g[col]!r}")
                if len(problems) > 10:
                    problems.append("… (further diffs suppressed)")
                    return problems
    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(HERE / "warehouse" / "pipeline.duckdb"))
    ap.add_argument("--tolerance", type=float, default=1e-6)
    args = ap.parse_args()

    con = duckdb.connect(args.db, read_only=True)
    tables = sorted(p.stem for p in GOLDEN_DIR.glob("*.json"))
    bad = 0
    for t in tables:
        try:
            problems = compare_table(con, t, args.tolerance)
        except Exception as e:
            problems = [f"comparison error: {e}"]
        if problems:
            bad += 1
            print(f"❌ {t}")
            for p in problems[:12]:
                print(f"     {p}")
        else:
            print(f"✅ {t}")
    print(f"\n{len(tables) - bad}/{len(tables)} tables match the golden snapshots.")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
