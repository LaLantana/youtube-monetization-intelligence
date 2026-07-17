from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("derive_trend_movement_features")],
    tests=[
        test("count_greater_than", count=0),
    ],
)
def summarize_threshold_derivation(
    derive_trend_movement_features: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = derive_trend_movement_features

    return data.aggregate(
        row_count=data.count(),
        daily_movement_min=data.daily_movement.min(),
        daily_movement_max=data.daily_movement.max(),
        daily_movement_avg=data.daily_movement.mean(),
        weekly_movement_min=data.weekly_movement.min(),
        weekly_movement_max=data.weekly_movement.max(),
        weekly_movement_avg=data.weekly_movement.mean(),
        daily_movement_abs_avg=data.daily_movement_abs.mean(),
        weekly_movement_abs_avg=data.weekly_movement_abs.mean(),
        trend_momentum_avg=data.trend_movement_momentum.mean(),
    )