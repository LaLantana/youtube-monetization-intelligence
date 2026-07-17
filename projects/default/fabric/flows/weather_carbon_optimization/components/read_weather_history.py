from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import read, test

COORDINATES = [
    {"city": "Manchester", "latitude": 53.4808, "longitude": -2.2426},
    {"city": "Birmingham", "latitude": 52.4862, "longitude": -1.8904},
    {"city": "Leeds", "latitude": 53.8008, "longitude": -1.5491},
    {"city": "Bristol", "latitude": 51.4545, "longitude": -2.5879},
    {"city": "London", "latitude": 51.5074, "longitude": -0.1278},
]

HOURLY_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "cloud_cover",
    "wind_speed_10m",
]

BASE_URL = "https://open-meteo.ascend.dev/v1/forecast"


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
                return pd.read_json(response.read().decode("utf-8"), typ="series").to_dict()
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

    raise RuntimeError(f"Failed to fetch weather data after retries: {last_error}")


def _build_history_url(latitude: float, longitude: float) -> str:
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=30)
    query = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ",".join(HOURLY_FIELDS),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "timezone": "GMT",
        }
    )
    return f"{BASE_URL}?{query}"


@read(
    on_schema_change="sync_all_columns",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="weather_timestamp"),
        test("not_null", column="city"),
    ],
)
def read_weather_history(context: ComponentExecutionContext) -> pd.DataFrame:
    rows: list[pd.DataFrame] = []

    for location in COORDINATES:
        url = _build_history_url(location["latitude"], location["longitude"])
        payload = _request_json(url)
        hourly = payload["hourly"]
        hourly_df = pd.DataFrame(hourly)
        hourly_df["weather_timestamp"] = pd.to_datetime(hourly_df["time"], utc=True)
        hourly_df["city"] = location["city"]
        hourly_df["requested_latitude"] = location["latitude"]
        hourly_df["requested_longitude"] = location["longitude"]
        hourly_df["api_latitude"] = payload.get("latitude")
        hourly_df["api_longitude"] = payload.get("longitude")
        hourly_df["timezone"] = payload.get("timezone")
        hourly_df["elevation"] = payload.get("elevation")
        rows.append(hourly_df)
        log(f"Fetched {len(hourly_df)} historical weather rows for {location['city']}")

    result = pd.concat(rows, ignore_index=True)
    result["ingested_at"] = pd.Timestamp.now(tz="UTC")
    return result