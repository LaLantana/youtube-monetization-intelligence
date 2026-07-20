SELECT
    DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
    MEDIAN(COALESCE(view_count, 0)) AS median_view_count_for_top_10
FROM {{ ref('apply_recency_weighting') }}
WHERE daily_rank <= 10
GROUP BY 1
ORDER BY 1

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}