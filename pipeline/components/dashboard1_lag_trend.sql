SELECT
    snapshot_month,
    AVG(COALESCE(avg_publish_to_trending_lag_hours, 0)) AS avg_publish_to_trending_lag_hours
FROM {{ ref('timing_intelligence_summary') }}
GROUP BY snapshot_month
ORDER BY snapshot_month

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}