WITH base AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        monetization_quadrant,
        youtube_category_name,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT video_id) AS unique_video_count,
        AVG(COALESCE(estimated_rpm, 0)) AS avg_estimated_rpm,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(recency_weighted_estimated_revenue, 0)) AS avg_recency_weighted_estimated_revenue,
        AVG(COALESCE(view_count, 0)) AS avg_view_count,
        AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score
    FROM {{ ref('apply_recency_weighting') }}
    GROUP BY
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)),
        monetization_quadrant,
        youtube_category_name
)
SELECT
    *,
    ROW_NUMBER() OVER (
        PARTITION BY snapshot_month, monetization_quadrant
        ORDER BY avg_recency_weighted_estimated_revenue DESC, avg_estimated_revenue DESC, youtube_category_name
    ) AS monetization_category_rank
FROM base

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}