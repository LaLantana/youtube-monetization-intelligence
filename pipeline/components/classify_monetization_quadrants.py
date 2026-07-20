from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("score_engagement_quality")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def classify_monetization_quadrants(
    score_engagement_quality: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = score_engagement_quality
    score = data.engagement_quality_score
    safe_view_count = data.view_count.fill_null(0)

    return data.mutate(
        monetization_quadrant=score.isnull().ifelse(
            "skip",
            (safe_view_count >= 1_000_000).ifelse(
                (score >= 0.05).ifelse("premium", "passive"),
                (score >= 0.05).ifelse("niche_gem", "skip"),
            ),
        )
    )