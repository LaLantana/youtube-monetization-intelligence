from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("correct_language_and_quality_flags")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def separate_content_length_tracks(
    correct_language_and_quality_flags: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = correct_language_and_quality_flags

    return data.mutate(
        content_duration_seconds=data.youtube_duration_seconds,
        content_length_track=(data.youtube_duration_seconds < 180).ifelse("short_form", "long_form"),
        long_form_duration_multiplier=(data.youtube_duration_seconds < 180)
        .ifelse(
            None,
            (data.youtube_duration_seconds < 480)
            .ifelse(
                1.0,
                (data.youtube_duration_seconds < 600).ifelse(1.3, 1.5),
            ),
        ),
    )