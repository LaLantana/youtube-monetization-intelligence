from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("filter_english_topic_analysis_eligibility")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def classify_engagement_tiers(
    filter_english_topic_analysis_eligibility: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = filter_english_topic_analysis_eligibility
    safe_view_count = data.view_count.fill_null(0)

    return data.mutate(
        engagement_tier=(safe_view_count < 10_000).ifelse(
            "emerging",
            (safe_view_count < 100_000).ifelse(
                "growing",
                (safe_view_count < 1_000_000).ifelse("established", "breakout"),
            ),
        )
    )