from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import pandas as pd
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import read, test

BASE_URL = "https://uk-carbon-intensity.ascend.dev/intensity"


def _request_json(url: str) -> dict[str, Any]:
    delay_seconds = 1.0
    last_error: Exception | None = None

    for attempt in range(5):
        try:
            request = Request(
                url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "AscendWeatherCarbonOptimization/1.0",
                },
            )
            with urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            last_error = error
            if error.code in {429, 500, 502, 503, 504}:
                retry_after = error.headers.get("Retry-After")
                sleep_for = float(retry_after) if retry_after else delay_seconds
                time.sleep(sleep_for)
                delay_seconds *= 2
                continue
            raise
        except (URLError, TimeoutError) as error:
            last_error = error
            time.sleep(delay_seconds)
            delay_seconds *= 2

    raise RuntimeError(f"Failed to fetch carbon intensity data after retries: {last_error}")


def _history_url() -> str:
    now_utc = datetime.now(timezone.utc)
    end_time = now_utc.replace(minute=0, second=0, microsecond=0)
    start_time = end_time - timedelta(days=30)
    return f"{BASE_URL}/{start_time.strftime('%Y-%m-%dT%H:%MZ')}/{end_time.strftime('%Y-%m-%dT%H:%MZ')}"


@read(
    on_schema_change="sync_all_columns",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="carbon_timestamp_hour"),
        test("not_null", column="actual_intensity_gco2_per_kwh"),
    ],
)
def read_carbon_history(context: ComponentExecutionContext) -> pd.DataFrame:
    payload = _request_json(_history_url())
    rows = []
    for item in payload["data"]:
        intensity = item.get("intensity", {})
        rows.append(
            {
                "period_start": item.get("from"),
                "period_end": item.get("to"),
                "forecast_intensity_gco2_per_kwh": intensity.get("forecast"),
                "actual_intensity_gco2_per_kwh": intensity.get("actual"),
                "intensity_index": intensity.get("index"),
            }
        )

    result = pd.DataFrame(rows)
    result["period_start"] = pd.to_datetime(result["period_start"], utc=True)
    result["period_end"] = pd.to_datetime(result["period_end"], utc=True)
    result["period_midpoint"] = result["period_start"] + (result["period_end"] - result["period_start"]) / 2
    result["period_hour"] = result["period_start"].dt.floor("H")
    hourly_result = (
        result.groupby("period_hour", as_index=False)
        .agg(
            forecast_intensity_gco2_per_kwh=("forecast_intensity_gco2_per_kwh", "mean"),
            actual_intensity_gco2_per_kwh=("actual_intensity_gco2_per_kwh", "mean"),
        )
        .rename(columns={"period_hour": "carbon_timestamp_hour"})
    )
    intensity_rank = {
        "very low": 0,
        "low": 1,
        "moderate": 2,
        "high": 3,
        "very high": 4,
    }
    result["intensity_rank"] = result["intensity_index"].map(intensity_rank)
    hourly_index = (
        result.groupby("period_hour", as_index=False)["intensity_rank"].max()
        .rename(columns={"period_hour": "carbon_timestamp_hour"})
    )
    inverse_intensity_rank = {value: key for key, value in intensity_rank.items()}
    hourly_index["intensity_index"] = hourly_index["intensity_rank"].map(inverse_intensity_rank)
    result = hourly_result.merge(hourly_index[["carbon_timestamp_hour", "intensity_index"]], on="carbon_timestamp_hour", how="left")
    result["ingested_at"] = pd.Timestamp.now(tz="UTC")
    result["source_half_hour_records"] = len(rows)
    log(f"Fetched {len(rows)} carbon intensity half-hour records and aggregated to {len(result)} hourly records")
    return result