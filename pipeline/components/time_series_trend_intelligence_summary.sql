WITH monthly_series AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        content_length_track,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT video_id) AS unique_video_count,
        AVG(COALESCE(view_count, 0)) AS avg_view_count,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(recency_weighted_estimated_revenue, 0)) AS avg_recency_weighted_estimated_revenue,
        AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score,
        AVG(COALESCE(recency_weighted_trend_movement_momentum, 0)) AS avg_recency_weighted_trend_movement_momentum,
        AVG(COALESCE(monthly_platform_health_index, 0)) AS avg_monthly_platform_health_index
    FROM {{ ref('apply_recency_weighting') }} arw
    LEFT JOIN {{ ref('monthly_platform_health_index') }} mphi
        ON DATE_TRUNC('month', TRY_CAST(arw.snapshot_date AS TIMESTAMP)) = mphi.snapshot_month
    GROUP BY
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)),
        content_length_track
)
SELECT
    *,
    avg_view_count - LAG(avg_view_count) OVER (
        PARTITION BY content_length_track
        ORDER BY snapshot_month
    ) AS avg_view_count_month_over_month_change,
    avg_estimated_revenue - LAG(avg_estimated_revenue) OVER (
        PARTITION BY content_length_track
        ORDER BY snapshot_month
    ) AS avg_estimated_revenue_month_over_month_change,
    avg_monthly_platform_health_index - LAG(avg_monthly_platform_health_index) OVER (
        PARTITION BY content_length_track
        ORDER BY snapshot_month
    ) AS platform_health_month_over_month_change
FROM monthly_series

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}