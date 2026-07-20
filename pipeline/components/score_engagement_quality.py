from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("classify_engagement_tiers")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def score_engagement_quality(
    classify_engagement_tiers: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = classify_engagement_tiers
    safe_view_count = data.view_count.fill_null(0)
    safe_like_count = data.like_count.fill_null(0)
    safe_comment_count = data.comment_count.fill_null(0)

    engagement_score = (
        (safe_like_count * 1.0) + (safe_comment_count * 2.0)
    ) / safe_view_count.nullif(0)

    return data.mutate(
        engagement_quality_score=engagement_score,
        engagement_quality_band=engagement_score.isnull().ifelse(
            "unscored",
            (engagement_score < 0.02).ifelse(
                "low",
                (engagement_score < 0.05).ifelse("medium", "high"),
            ),
        ),
    )