SELECT
    DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
    AVG(COALESCE(view_count, 0)) AS avg_view_count,
    AVG(COALESCE(like_count, 0)) AS avg_like_count,
    AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score
FROM {{ ref('apply_recency_weighting') }}
GROUP BY 1
ORDER BY 1

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}