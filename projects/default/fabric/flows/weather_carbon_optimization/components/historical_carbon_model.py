from __future__ import annotations

import pandas as pd
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import ref, test, transform


@transform(
    inputs=[
        ref("historical_weather_carbon_features"),
    ],
    input_data_format="pandas",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="facility_id"),
        test("not_null", column="baseline_actual_intensity_gco2_per_kwh"),
    ],
)
def historical_carbon_model(
    historical_weather_carbon_features: pd.DataFrame,
    context: ComponentExecutionContext,
) -> pd.DataFrame:
    df = historical_weather_carbon_features.copy()
    grouped = (
        df.groupby(["facility_id", "timestamp_hour"], as_index=False)
        .agg(
            baseline_actual_intensity_gco2_per_kwh=("actual_intensity_gco2_per_kwh", "mean"),
            baseline_forecast_intensity_gco2_per_kwh=("forecast_intensity_gco2_per_kwh", "mean"),
            avg_temperature_2m=("temperature_2m", "mean"),
            avg_relative_humidity_2m=("relative_humidity_2m", "mean"),
            avg_apparent_temperature=("apparent_temperature", "mean"),
            avg_precipitation=("precipitation", "mean"),
            avg_cloud_cover_pct=("cloud_cover_pct", "mean"),
            avg_wind_speed_kmh=("wind_speed_kmh", "mean"),
            avg_tariff_gbp_per_kwh=("tariff_gbp_per_kwh", "mean"),
            avg_carbon_cost_gbp_per_kwh=("carbon_cost_gbp_per_kwh", "mean"),
            avg_combined_cost_gbp_per_kwh=("combined_cost_gbp_per_kwh", "mean"),
        )
    )
    grouped["temperature_effect_gco2_per_kwh"] = (12 - grouped["avg_temperature_2m"]).clip(lower=0) * 1.2
    grouped["cloud_cover_effect_gco2_per_kwh"] = grouped["avg_cloud_cover_pct"] * 0.08
    grouped["wind_effect_gco2_per_kwh"] = grouped["avg_wind_speed_kmh"] * -0.9
    grouped["precipitation_effect_gco2_per_kwh"] = grouped["avg_precipitation"] * 1.5
    grouped["predicted_intensity_gco2_per_kwh"] = (
        grouped["baseline_actual_intensity_gco2_per_kwh"]
        + grouped["temperature_effect_gco2_per_kwh"]
        + grouped["cloud_cover_effect_gco2_per_kwh"]
        + grouped["wind_effect_gco2_per_kwh"]
        + grouped["precipitation_effect_gco2_per_kwh"]
    ).clip(lower=20)
    grouped["model_version"] = "heuristic_v1"
    grouped["training_rows"] = len(df)
    log(f"Historical model trained from {len(df)} rows into {len(grouped)} facility-hour baselines")
    return grouped