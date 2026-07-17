from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[
        ref("standardize_trending_videos_quality"),
        ref("read_youtube_video_enrichment"),
    ],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
    ],
)
def transform_youtube_enrichment(
    standardize_trending_videos_quality: ir.Table,
    read_youtube_video_enrichment: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    enrichment = read_youtube_video_enrichment.filter(
        read_youtube_video_enrichment.status == "processed"
    ).view()
    standardized = standardize_trending_videos_quality.view()

    return standardized.left_join(enrichment, standardized.video_id == enrichment.video_id).select(
        standardized,
        enrichment.duration_seconds,
        enrichment.category_name,
        enrichment.subscriber_count,
    )