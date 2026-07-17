from __future__ import annotations

import pandas as pd
import ascend_project_code.weather_carbon as WC
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import ref, test, transform


@transform(
    inputs=[
        ref("forecast_carbon_predictions"),
        ref("read_machines"),
        ref("read_production_schedule"),
        ref("read_facilities"),
    ],
    input_data_format="pandas",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="machine_id"),
        test("not_null", column="facility_id"),
        test("not_null", column="total_savings_gbp"),
    ],
)
def operations_optimization_recommendations(
    forecast_carbon_predictions: pd.DataFrame,
    read_machines: pd.DataFrame,
    read_production_schedule: pd.DataFrame,
    read_facilities: pd.DataFrame,
    context: ComponentExecutionContext,
) -> pd.DataFrame:
    predictions = forecast_carbon_predictions.copy()
    predictions["day_of_week"] = pd.to_datetime(predictions["forecast_timestamp"], utc=True).dt.day_name()
    predictions["candidate_hour"] = pd.to_datetime(predictions["forecast_timestamp"], utc=True).dt.hour

    candidate_hours = (
        predictions[[
            "facility_id",
            "facility_name",
            "region",
            "day_of_week",
            "candidate_hour",
            "tariff_bucket",
            "tariff_gbp_per_kwh",
            "predicted_intensity_gco2_per_kwh",
            "predicted_carbon_kg_per_kwh",
            "predicted_carbon_cost_gbp_per_kwh",
            "predicted_combined_cost_gbp_per_kwh",
        ]]
        .sort_values(["facility_id", "day_of_week", "candidate_hour"])
        .drop_duplicates(["facility_id", "day_of_week", "candidate_hour"])
    )

    machines = read_machines.copy()
    machines = machines[machines["schedulable"] == True]

    schedule = read_production_schedule.copy().merge(machines, on=["machine_id", "facility_id"], how="inner")
    baseline = schedule.merge(
        candidate_hours,
        left_on=["facility_id", "day_of_week", "scheduled_hour"],
        right_on=["facility_id", "day_of_week", "candidate_hour"],
        how="left",
        suffixes=("", "_baseline"),
    )
    baseline = baseline.rename(
        columns={
            "tariff_bucket": "baseline_tariff_bucket",
            "tariff_gbp_per_kwh": "baseline_tariff_gbp_per_kwh",
            "predicted_intensity_gco2_per_kwh": "baseline_predicted_intensity_gco2_per_kwh",
            "predicted_carbon_kg_per_kwh": "baseline_predicted_carbon_kg_per_kwh",
            "predicted_carbon_cost_gbp_per_kwh": "baseline_predicted_carbon_cost_gbp_per_kwh",
            "predicted_combined_cost_gbp_per_kwh": "baseline_predicted_combined_cost_gbp_per_kwh",
        }
    )
    baseline["runtime_hours"] = baseline["runtime_hours"].astype(float)
    baseline["energy_kwh"] = baseline["energy_kwh"].astype(float)
    baseline["baseline_energy_cost_gbp"] = baseline["energy_kwh"] * baseline["baseline_tariff_gbp_per_kwh"]
    baseline["baseline_carbon_kg"] = baseline["energy_kwh"] * baseline["baseline_predicted_carbon_kg_per_kwh"]
    baseline["baseline_carbon_cost_gbp"] = WC.carbon_cost_gbp(baseline["baseline_carbon_kg"])

    candidate_map = candidate_hours.rename(
        columns={
            "candidate_hour": "recommended_hour",
            "tariff_bucket": "recommended_tariff_bucket",
            "tariff_gbp_per_kwh": "recommended_tariff_gbp_per_kwh",
            "predicted_intensity_gco2_per_kwh": "recommended_predicted_intensity_gco2_per_kwh",
            "predicted_carbon_kg_per_kwh": "recommended_predicted_carbon_kg_per_kwh",
            "predicted_carbon_cost_gbp_per_kwh": "recommended_carbon_cost_gbp_per_kwh",
            "predicted_combined_cost_gbp_per_kwh": "recommended_combined_cost_gbp_per_kwh",
        }
    )

    candidates = baseline.merge(candidate_map, on=["facility_id", "facility_name", "region", "day_of_week"], how="inner")
    candidates = candidates[candidates["recommended_hour"] != candidates["scheduled_hour"]]
    candidates["recommended_energy_cost_gbp"] = candidates["energy_kwh"] * candidates["recommended_tariff_gbp_per_kwh"]
    candidates["recommended_carbon_kg"] = candidates["energy_kwh"] * candidates["recommended_predicted_carbon_kg_per_kwh"]
    candidates["recommended_carbon_cost_gbp"] = WC.carbon_cost_gbp(candidates["recommended_carbon_kg"])
    candidates["energy_cost_savings_gbp"] = candidates["baseline_energy_cost_gbp"] - candidates["recommended_energy_cost_gbp"]
    candidates["carbon_savings_kg"] = candidates["baseline_carbon_kg"] - candidates["recommended_carbon_kg"]
    candidates["carbon_cost_savings_gbp"] = candidates["baseline_carbon_cost_gbp"] - candidates["recommended_carbon_cost_gbp"]
    candidates["total_savings_gbp"] = candidates["energy_cost_savings_gbp"] + candidates["carbon_cost_savings_gbp"]
    candidates = candidates[(candidates["total_savings_gbp"] > 0) & (candidates["carbon_savings_kg"] > 0)]

    ranking_columns = ["facility_id", "machine_id", "day_of_week", "shift"]
    recommendations = (
        candidates.sort_values(ranking_columns + ["total_savings_gbp", "carbon_savings_kg"], ascending=[True, True, True, True, False, False])
        .drop_duplicates(ranking_columns)
    )
    recommendations["recommended_runtime_window_end_hour"] = recommendations["recommended_hour"] + recommendations["runtime_hours"]
    recommendations["baseline_runtime_window_end_hour"] = recommendations["scheduled_hour"] + recommendations["runtime_hours"]
    recommendations["recommendation_generated_at"] = pd.Timestamp.now(tz="UTC")
    log(f"Generated {len(recommendations)} positive-savings schedule recommendations")
    return recommendations