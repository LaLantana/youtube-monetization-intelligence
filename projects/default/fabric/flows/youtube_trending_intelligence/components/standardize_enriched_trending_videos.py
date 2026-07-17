from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("transform_youtube_enrichment")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def standardize_enriched_trending_videos(
    transform_youtube_enrichment: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = transform_youtube_enrichment

    return data.mutate(
        source_language=data.language,
        source_language_missing_flag=data.language_missing_flag,
        source_video_tags_missing_flag=data.video_tags_missing_flag,
        source_view_count_is_zero=data.view_count_is_zero,
        country_code=data.country,
        video_title=data.title,
        youtube_duration_seconds=data.duration_seconds,
        youtube_category_name=data.category_name,
        youtube_subscriber_count=data.subscriber_count,
    )