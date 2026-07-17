import ibis
from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, transform


@transform(
    inputs=[
        ref("goat_metrics"),
    ]
)
def goat_summary(
    goat_metrics: ibis.Table,
    context: ComponentExecutionContext,
) -> ibis.Table:
    return goat_metrics.mutate(
        utilization_band=ibis.cases(
            (goat_metrics.trips_completed >= 180, ibis.literal("high")),
            (goat_metrics.trips_completed >= 90, ibis.literal("medium")),
            else_=ibis.literal("low"),
        ),
        revenue_per_trip=(goat_metrics.total_revenue_ytd / goat_metrics.trips_completed).round(2),
        maintenance_ratio=(goat_metrics.maintenance_cost_ytd / goat_metrics.total_revenue_ytd).round(4),
    )