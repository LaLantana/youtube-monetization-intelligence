WITH base AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        youtube_category_name,
        content_length_track,
        engagement_quality_band,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT video_id) AS unique_video_count,
        AVG(COALESCE(view_count, 0)) AS avg_view_count,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(recency_weighted_estimated_revenue, 0)) AS avg_recency_weighted_estimated_revenue,
        AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score,
        AVG(COALESCE(publish_to_trending_lag_hours, 0)) AS avg_publish_to_trending_lag_hours
    FROM {{ ref('apply_recency_weighting') }}
    GROUP BY
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)),
        youtube_category_name,
        content_length_track,
        engagement_quality_band
)
SELECT
    *,
    ROW_NUMBER() OVER (
        PARTITION BY snapshot_month, content_length_track
        ORDER BY avg_recency_weighted_estimated_revenue DESC, avg_view_count DESC, engagement_quality_band
    ) AS content_category_rank
FROM base

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}