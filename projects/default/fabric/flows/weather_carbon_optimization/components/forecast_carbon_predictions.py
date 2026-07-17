from __future__ import annotations

import pandas as pd
import ascend_project_code.weather_carbon as WC
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import ref, test, transform


@transform(
    inputs=[
        ref("forecast_weather_features"),
        ref("historical_carbon_model"),
    ],
    input_data_format="pandas",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="facility_id"),
        test("not_null", column="predicted_intensity_gco2_per_kwh"),
    ],
)
def forecast_carbon_predictions(
    forecast_weather_features: pd.DataFrame,
    historical_carbon_model: pd.DataFrame,
    context: ComponentExecutionContext,
) -> pd.DataFrame:
    forecast = forecast_weather_features.copy()
    model = historical_carbon_model[[
        "facility_id",
        "timestamp_hour",
        "baseline_actual_intensity_gco2_per_kwh",
    ]].drop_duplicates()
    result = forecast.merge(model, left_on=["facility_id", "timestamp_hour"], right_on=["facility_id", "timestamp_hour"], how="left")
    fallback_baseline = historical_carbon_model.groupby("facility_id", as_index=False)["baseline_actual_intensity_gco2_per_kwh"].mean()
    result = result.merge(fallback_baseline.rename(columns={"baseline_actual_intensity_gco2_per_kwh": "facility_avg_baseline_intensity"}), on="facility_id", how="left")
    result["baseline_intensity_gco2_per_kwh"] = result["baseline_actual_intensity_gco2_per_kwh"].fillna(result["facility_avg_baseline_intensity"])
    result["temperature_effect_gco2_per_kwh"] = (12 - result["temperature_2m"]).clip(lower=0) * 1.2
    result["cloud_cover_effect_gco2_per_kwh"] = result["cloud_cover_pct"] * 0.08
    result["wind_effect_gco2_per_kwh"] = result["wind_speed_kmh"] * -0.9
    result["precipitation_effect_gco2_per_kwh"] = result["precipitation"] * 1.5
    result["predicted_intensity_gco2_per_kwh"] = (
        result["baseline_intensity_gco2_per_kwh"]
        + result["temperature_effect_gco2_per_kwh"]
        + result["cloud_cover_effect_gco2_per_kwh"]
        + result["wind_effect_gco2_per_kwh"]
        + result["precipitation_effect_gco2_per_kwh"]
    ).clip(lower=20)
    result["predicted_carbon_kg_per_kwh"] = result["predicted_intensity_gco2_per_kwh"] / 1000.0
    result["predicted_carbon_cost_gbp_per_kwh"] = WC.carbon_cost_gbp(result["predicted_carbon_kg_per_kwh"])
    result["predicted_combined_cost_gbp_per_kwh"] = result["tariff_gbp_per_kwh"] + result["predicted_carbon_cost_gbp_per_kwh"]
    result["prediction_generated_at"] = pd.Timestamp.now(tz="UTC")
    log(f"Scored {len(result)} forecast hourly rows")
    return result