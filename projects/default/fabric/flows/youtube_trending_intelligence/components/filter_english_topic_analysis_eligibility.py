from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("separate_content_length_tracks")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def filter_english_topic_analysis_eligibility(
    separate_content_length_tracks: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = separate_content_length_tracks

    normalized_language = data.corrected_language.lower()

    return data.mutate(
        english_topic_analysis_eligible=(
            (data.content_length_track == "long_form")
            & data.corrected_language.notnull()
            & (
                (normalized_language == "en")
                | (normalized_language == "eng")
                | (normalized_language == "english")
            )
        ),
        topic_analysis_exclusion_reason=(data.content_length_track != "long_form").ifelse(
            "short_form",
            data.corrected_language.isnull().ifelse(
                "missing_language",
                (
                    (normalized_language == "en")
                    | (normalized_language == "eng")
                    | (normalized_language == "english")
                ).ifelse(None, "non_english_first_pass"),
            ),
        ),
    )