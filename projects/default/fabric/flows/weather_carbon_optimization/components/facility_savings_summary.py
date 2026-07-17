from __future__ import annotations

import pandas as pd
from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import ref, test, transform


@transform(
    inputs=[
        ref("operations_optimization_recommendations"),
    ],
    input_data_format="pandas",
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="facility_id"),
        test("not_null", column="total_savings_gbp"),
    ],
)
def facility_savings_summary(
    operations_optimization_recommendations: pd.DataFrame,
    context: ComponentExecutionContext,
) -> pd.DataFrame:
    df = operations_optimization_recommendations.copy()
    summary = (
        df.groupby(["facility_id", "facility_name", "region"], as_index=False)
        .agg(
            recommendation_count=("machine_id", "count"),
            total_savings_gbp=("total_savings_gbp", "sum"),
            energy_cost_savings_gbp=("energy_cost_savings_gbp", "sum"),
            carbon_cost_savings_gbp=("carbon_cost_savings_gbp", "sum"),
            carbon_savings_kg=("carbon_savings_kg", "sum"),
        )
        .sort_values("total_savings_gbp", ascending=False)
    )
    summary["summary_generated_at"] = pd.Timestamp.now(tz="UTC")
    log(f"Facility savings summary contains {len(summary)} rows")
    return summary