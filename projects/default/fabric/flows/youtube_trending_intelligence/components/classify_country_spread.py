from __future__ import annotations

from ibis import ir

from ascend.application.context import ComponentExecutionContext
from ascend.resources import ref, test, transform


@transform(
    inputs=[ref("classify_viral_fingerprint")],
    tests=[
        test("count_greater_than", count=0),
        test("not_null", column="video_id"),
        test("not_null", column="snapshot_date"),
    ],
)
def classify_country_spread(
    classify_viral_fingerprint: ir.Table,
    context: ComponentExecutionContext,
) -> ir.Table:
    data = classify_viral_fingerprint

    distinct_country_count = data.country_code.nunique(where=data.country_code.notnull())

    return data.mutate(
        country_spread_distinct_count=distinct_country_count.over(group_by=data.video_id),
        country_spread_classification=(distinct_country_count.over(group_by=data.video_id) <= 1).ifelse(
            "single_market",
            (distinct_country_count.over(group_by=data.video_id) <= 3).ifelse(
                "regional_multi_market",
                "global_multi_market",
            ),
        ),
    )