from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("estimate_video_revenue")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def derive_trend_movement_features(
    estimate_video_revenue: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = estimate_video_revenue
    safe_daily_movement = data.daily_movement.fill_null(0)
    safe_weekly_movement = data.weekly_movement.fill_null(0)

    return data.mutate(
        daily_movement_abs=safe_daily_movement.abs(),
        weekly_movement_abs=safe_weekly_movement.abs(),
        trend_movement_direction=(safe_daily_movement > 0).ifelse(
            "up",
            (safe_daily_movement < 0).ifelse("down", "flat"),
        ),
        trend_movement_momentum=(safe_daily_movement > 0).ifelse(
            safe_daily_movement + safe_weekly_movement,
            (safe_daily_movement < 0).ifelse(
                (safe_daily_movement.abs() + safe_weekly_movement.abs()) * -1,
                0,
            ),
        ),
    )