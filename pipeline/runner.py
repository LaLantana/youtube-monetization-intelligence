"""Minimal DAG runner for the YouTube Trending Intelligence pipeline.

Executes the original hackathon components (SQL + Python, in components/)
verbatim on DuckDB. The Ascend platform they were written for is gone; this
runner plus the ascend_shim package replaces it.

- SQL components: Jinja-rendered ({{ ref('x') }} -> analytics table,
  {{ with_test(...) }} -> collected as a data test), then materialized as
  CREATE OR REPLACE TABLE analytics.<name>.
- Python components: imported with the shim on sys.path; the @transform/@read
  decorator metadata gives inputs + tests; ibis (DuckDB backend) supplies the
  input tables, and the returned ibis/pandas result is materialized.
- Tests: count_greater_than, not_null (the only two kinds the project uses).

Usage:
  python runner.py --db warehouse/pipeline.duckdb            # run everything
  python runner.py --select dashboard1_monetization_kpis      # one target + ancestors
  python runner.py --stub read_youtube_video_enrichment       # empty-schema stand-in
  python runner.py --exclude inspect_youtube_videos_payload
"""
from __future__ import annotations

import argparse
import importlib.util
import inspect
import sys
import time
from pathlib import Path

import duckdb
import ibis
import pandas as pd
from jinja2 import ChainableUndefined, Environment

HERE = Path(__file__).resolve().parent
COMPONENTS = HERE / "components"
sys.path.insert(0, str(HERE / "ascend_shim"))

RAW_SCHEMA = "YouTube Trending Videos"  # the source table's home, matching the original SQL
OUT_SCHEMA = "analytics"

# Empty-table schemas for components stubbed out (e.g. no API key available).
STUB_SCHEMAS = {
    "read_youtube_video_enrichment": {
        "run_id": "VARCHAR", "processed_at": "TIMESTAMP", "video_id": "VARCHAR",
        "duration_seconds": "BIGINT", "category_name": "VARCHAR",
        "subscriber_count": "BIGINT", "status": "VARCHAR",
        "priority_bucket": "VARCHAR", "publish_date": "DATE",
        "snapshot_date": "DATE", "quota_units_consumed": "BIGINT",
        "error_message": "VARCHAR",
    },
}


class Component:
    def __init__(self, name: str, kind: str, path: Path):
        self.name, self.kind, self.path = name, kind, path
        self.inputs: list[str] = []
        self.tests: list[tuple[str, dict]] = []
        self.fn = None
        self.sql: str | None = None


class _PlatformNoise(ChainableUndefined):
    """Ascend platform decoration we don't reproduce (retry_strategy, etc.)
    renders to nothing instead of erroring. Data logic never lands here:
    ref/with_test/config are provided explicitly."""

    def __call__(self, *_a, **_kw):
        return ""


def load_sql_component(path: Path) -> Component:
    comp = Component(path.stem, "sql", path)
    env = Environment(undefined=_PlatformNoise)

    def ref(name: str) -> str:
        comp.inputs.append(name)
        return f'"{OUT_SCHEMA}"."{name}"'

    def with_test(kind: str, **params) -> str:
        comp.tests.append((kind, params))
        return ""

    comp.sql = env.from_string(path.read_text()).render(
        ref=ref, with_test=with_test, config=lambda **_kw: ""
    )
    return comp


def load_py_component(path: Path) -> Component:
    spec = importlib.util.spec_from_file_location(f"components.{path.stem}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    fn = getattr(mod, path.stem, None)
    if fn is None or not hasattr(fn, "__ascend_component__"):
        raise RuntimeError(f"{path.name}: no decorated component function '{path.stem}' found")
    meta = fn.__ascend_component__
    comp = Component(path.stem, "python", path)
    comp.fn = fn
    comp.inputs = list(meta["inputs"])
    comp.tests = [(t.kind, t.params) for t in meta["tests"]]
    return comp


def topo_order(components: dict[str, Component], targets: list[str]) -> list[str]:
    order: list[str] = []
    state: dict[str, int] = {}  # 1=visiting 2=done

    def visit(name: str) -> None:
        if name not in components:
            return  # external source (raw table) — nothing to build
        if state.get(name) == 2:
            return
        if state.get(name) == 1:
            raise RuntimeError(f"dependency cycle at {name}")
        state[name] = 1
        for up in components[name].inputs:
            visit(up)
        state[name] = 2
        order.append(name)

    for t in targets:
        visit(t)
    return order


def run_tests(con: duckdb.DuckDBPyConnection, comp: Component) -> list[str]:
    failures = []
    fq = f'"{OUT_SCHEMA}"."{comp.name}"'
    for kind, params in comp.tests:
        if kind == "count_greater_than":
            n = con.execute(f"SELECT count(*) FROM {fq}").fetchone()[0]
            if not n > params["count"]:
                failures.append(f"count_greater_than({params['count']}): got {n}")
        elif kind == "not_null":
            col = params["column"]
            n = con.execute(f'SELECT count(*) FROM {fq} WHERE "{col}" IS NULL').fetchone()[0]
            if n:
                failures.append(f"not_null({col}): {n} null rows")
        else:
            failures.append(f"unknown test kind: {kind}")
    return failures


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(HERE / "warehouse" / "pipeline.duckdb"))
    ap.add_argument("--select", help="comma-separated targets (default: all components)")
    ap.add_argument("--exclude", default="", help="comma-separated components to skip entirely")
    ap.add_argument("--stub", default="", help="comma-separated components to replace with empty tables")
    ap.add_argument(
        "--stub-parquet",
        default="",
        help="name=path pairs (comma-separated): replace a component with the contents of a parquet file",
    )
    ap.add_argument("--skip-tests", action="store_true")
    ap.add_argument(
        "--gc",
        action="store_true",
        help="drop each intermediate table once no remaining component needs it "
        "(dashboard tables are always kept) — caps peak disk for CI runs",
    )
    args = ap.parse_args()

    excluded = {s for s in args.exclude.split(",") if s}
    stubbed = {s for s in args.stub.split(",") if s}
    parquet_stubs = dict(p.split("=", 1) for p in args.stub_parquet.split(",") if p)
    stubbed |= set(parquet_stubs)

    components: dict[str, Component] = {}
    for path in sorted(COMPONENTS.iterdir()):
        if path.stem in excluded:
            continue
        if path.suffix == ".sql":
            components[path.stem] = load_sql_component(path)
        elif path.suffix == ".py":
            components[path.stem] = load_py_component(path)

    targets = [s for s in args.select.split(",") if s] if args.select else list(components)
    order = topo_order(components, targets)

    icon = ibis.duckdb.connect(args.db)
    con = icon.con  # underlying duckdb connection
    con.execute(f'CREATE SCHEMA IF NOT EXISTS "{OUT_SCHEMA}"')

    # For --gc: how many not-yet-run components still read each table.
    pending_readers: dict[str, int] = {}
    for name in order:
        for up in components[name].inputs:
            pending_readers[up] = pending_readers.get(up, 0) + 1

    def release_inputs(name: str) -> list[str]:
        dropped = []
        for up in components[name].inputs:
            pending_readers[up] -= 1
            if (
                pending_readers[up] == 0
                and up in components
                and not up.startswith(("dashboard1_", "dashboard2_"))
            ):
                con.execute(f'DROP TABLE IF EXISTS "{OUT_SCHEMA}"."{up}"')
                dropped.append(up)
        return dropped

    failed: list[str] = []
    for i, name in enumerate(order, 1):
        comp = components[name]
        fq = f'"{OUT_SCHEMA}"."{name}"'
        t0 = time.time()
        try:
            if name in parquet_stubs:
                con.execute(
                    f"CREATE OR REPLACE TABLE {fq} AS SELECT * FROM read_parquet(?)",
                    [parquet_stubs[name]],
                )
                status = "stubbed:parquet"
            elif name in stubbed:
                cols = STUB_SCHEMAS[name]
                ddl = ", ".join(f'"{c}" {t}' for c, t in cols.items())
                con.execute(f"CREATE OR REPLACE TABLE {fq} ({ddl})")
                status = "stubbed"
            elif comp.kind == "sql":
                con.execute(f"CREATE OR REPLACE TABLE {fq} AS\n{comp.sql}")
                status = "ok"
            else:
                from ascend.application.context import ComponentExecutionContext

                hints = {
                    p.name: p.annotation
                    for p in inspect.signature(comp.fn).parameters.values()
                }
                call_args = []
                for up in comp.inputs:
                    tbl = icon.table(up, database=OUT_SCHEMA)
                    ann = str(hints.get(up, ""))
                    call_args.append(tbl.to_pandas() if "DataFrame" in ann else tbl)
                result = comp.fn(*call_args, ComponentExecutionContext())
                if isinstance(result, pd.DataFrame):
                    con.execute(f"CREATE OR REPLACE TABLE {fq} AS SELECT * FROM result")
                else:
                    con.execute(
                        f"CREATE OR REPLACE TABLE {fq} AS {result.compile()}"
                        if hasattr(result, "compile")
                        else ""
                    )
                status = "ok"
        except Exception as e:
            failed.append(name)
            print(f"[{i:2}/{len(order)}] ❌ {name}: {type(e).__name__}: {e}")
            continue

        test_note = ""
        if not args.skip_tests and name not in stubbed:
            fails = run_tests(con, comp)
            if fails:
                failed.append(name)
                test_note = "  TEST FAIL: " + "; ".join(fails)
        n = con.execute(f"SELECT count(*) FROM {fq}").fetchone()[0]
        gc_note = ""
        if args.gc:
            dropped = release_inputs(name)
            if dropped:
                gc_note = f"  [gc: dropped {', '.join(dropped)}]"
        print(f"[{i:2}/{len(order)}] {'⚠️' if test_note else '✅'} {name} ({status}, {n} rows, {time.time()-t0:.1f}s){test_note}{gc_note}")

    if failed:
        print(f"\nFAILED components: {sorted(set(failed))}")
        return 1
    print(f"\nAll {len(order)} components built successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
