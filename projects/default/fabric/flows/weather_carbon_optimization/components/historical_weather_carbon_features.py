from __future__ import annotations

import pandas as pd
import ascend_project_code.weather_carbon as WC
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import ref, test, transform


@transform(
    inputs=[
        ref("read_weather_history"),
        ref("read_carbon_history"),
        ref("read_facilities"),
    ],
    input_data_format="pandas",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="facility_id"),
        test("not_null", column="carbon_timestamp_hour"),
        test("not_null", column="carbon_kg_per_kwh"),
    ],
)
def historical_weather_carbon_features(
    read_weather_history: pd.DataFrame,
    read_carbon_history: pd.DataFrame,
    read_facilities: pd.DataFrame,
    context: ComponentExecutionContext,
) -> pd.DataFrame:
    weather = read_weather_history.copy()
    weather["carbon_timestamp_hour"] = pd.to_datetime(weather["weather_timestamp"], utc=True).dt.floor("h")

    facilities = read_facilities[["facility_id", "facility_name", "city", "region"]].drop_duplicates()
    weather = weather.merge(facilities, on="city", how="inner")

    carbon = read_carbon_history.copy()
    carbon["carbon_timestamp_hour"] = pd.to_datetime(carbon["carbon_timestamp_hour"], utc=True)

    result = weather.merge(carbon, on="carbon_timestamp_hour", how="inner")
    result = WC.add_time_features(result, "carbon_timestamp_hour")
    result = WC.add_tariff_columns(result)
    result["carbon_kg_per_kwh"] = result["actual_intensity_gco2_per_kwh"] / 1000.0
    result["carbon_cost_gbp_per_kwh"] = WC.carbon_cost_gbp(result["carbon_kg_per_kwh"])
    result["combined_cost_gbp_per_kwh"] = result["tariff_gbp_per_kwh"] + result["carbon_cost_gbp_per_kwh"]
    result["is_heating_or_cooling_load"] = (result["temperature_2m"] < 8) | (result["temperature_2m"] > 18)
    result["precipitation_flag"] = result["precipitation"] > 0
    result["cloud_cover_pct"] = result["cloud_cover"].fillna(0)
    result["wind_speed_kmh"] = result["wind_speed_10m"]
    result["observed_rows"] = len(result)
    log(f"Historical training dataset contains {len(result)} hourly facility-weather-carbon records")
    return result