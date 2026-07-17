from __future__ import annotations

import pandas as pd
import ascend_project_code.weather_carbon as WC
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import ref, test, transform


@transform(
    inputs=[
        ref("read_weather_forecast"),
        ref("read_facilities"),
    ],
    input_data_format="pandas",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="facility_id"),
        test("not_null", column="forecast_timestamp"),
    ],
)
def forecast_weather_features(
    read_weather_forecast: pd.DataFrame,
    read_facilities: pd.DataFrame,
    context: ComponentExecutionContext,
) -> pd.DataFrame:
    forecast = read_weather_forecast.copy()
    forecast["forecast_timestamp"] = pd.to_datetime(forecast["forecast_timestamp"], utc=True)
    facilities = read_facilities[["facility_id", "facility_name", "city", "region"]].drop_duplicates()
    result = forecast.merge(facilities, on="city", how="inner")
    result = WC.add_time_features(result, "forecast_timestamp")
    result = WC.add_tariff_columns(result)
    result["is_heating_or_cooling_load"] = (result["temperature_2m"] < 8) | (result["temperature_2m"] > 18)
    result["precipitation_flag"] = result["precipitation"] > 0
    result["cloud_cover_pct"] = result["cloud_cover"].fillna(0)
    result["wind_speed_kmh"] = result["wind_speed_10m"]
    log(f"Forecast feature dataset contains {len(result)} hourly facility forecast rows")
    return result