WITH base AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        viral_fingerprint,
        monetization_quadrant,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT video_id) AS unique_video_count,
        AVG(COALESCE(view_count, 0)) AS avg_view_count,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(recency_weighted_estimated_revenue, 0)) AS avg_recency_weighted_estimated_revenue,
        AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score,
        AVG(COALESCE(trending_tenure_days, 0)) AS avg_trending_tenure_days,
        AVG(COALESCE(country_spread_distinct_count, 0)) AS avg_country_spread_distinct_count
    FROM {{ ref('apply_recency_weighting') }}
    GROUP BY
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)),
        viral_fingerprint,
        monetization_quadrant
)
SELECT
    *,
    ROW_NUMBER() OVER (
        PARTITION BY snapshot_month, viral_fingerprint
        ORDER BY avg_recency_weighted_estimated_revenue DESC, avg_estimated_revenue DESC
    ) AS viral_fingerprint_rank
FROM base

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}