SELECT
    DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
    AVG(ABS(COALESCE(daily_movement, 0))) AS volatility_score
FROM {{ ref('apply_recency_weighting') }}
GROUP BY 1
ORDER BY 1

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}
{{ with_test("not_null", column="volatility_score") }}