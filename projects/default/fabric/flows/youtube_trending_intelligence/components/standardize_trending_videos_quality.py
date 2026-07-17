from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.common.events import log
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("read_trending_videos_from_motherduck")],
    tests=[test("count_greater_than", count=0)],
)
def standardize_trending_videos_quality(
    read_trending_videos_from_motherduck: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    result = read_trending_videos_from_motherduck.mutate(
        # Source column is misspelled as `langauge`; preserve provenance and expose corrected analysis field.
        language=read_trending_videos_from_motherduck.langauge,
        language_missing_flag=read_trending_videos_from_motherduck.langauge.isnull(),
        video_tags_missing_flag=read_trending_videos_from_motherduck.video_tags.isnull(),
        view_count_is_zero=read_trending_videos_from_motherduck.view_count.fill_null(0) == 0,
    )

    zero_view_count = int(
        result.filter(result.view_count_is_zero).count().execute()
    )
    null_language_count = int(
        result.filter(result.language_missing_flag).count().execute()
    )
    null_video_tags_count = int(
        result.filter(result.video_tags_missing_flag).count().execute()
    )

    if zero_view_count > 0:
        sample_video_ids = (
            result.filter(result.view_count_is_zero)
            .select("video_id")
            .limit(10)
            .execute()["video_id"]
            .tolist()
        )
        log(f"Flagged {zero_view_count} rows with view_count = 0; sample_video_ids={sample_video_ids}")

    if null_language_count > 0:
        log(f"Flagged {null_language_count} rows with null langauge values; retained in main dataset")

    if null_video_tags_count > 0:
        log(f"Flagged {null_video_tags_count} rows with null video_tags; retained in main dataset")

    return result