from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("standardize_enriched_trending_videos")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def correct_language_and_quality_flags(
    standardize_enriched_trending_videos: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = standardize_enriched_trending_videos

    return data.mutate(
        corrected_language=data.source_language,
        corrected_language_missing_flag=data.source_language_missing_flag,
        retained_null_video_tags_flag=data.source_video_tags_missing_flag,
        retained_zero_view_count_flag=data.source_view_count_is_zero,
    )