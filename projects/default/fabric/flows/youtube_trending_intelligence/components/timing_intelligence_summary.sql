WITH base AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        publish_to_trending_lag_bucket,
        content_length_track,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT video_id) AS unique_video_count,
        AVG(COALESCE(publish_to_trending_lag_hours, 0)) AS avg_publish_to_trending_lag_hours,
        AVG(COALESCE(view_count, 0)) AS avg_view_count,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score
    FROM {{ ref('publish_to_trending_lag') }}
    GROUP BY
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)),
        publish_to_trending_lag_bucket,
        content_length_track
)
SELECT
    *,
    ROW_NUMBER() OVER (
        PARTITION BY snapshot_month
        ORDER BY avg_estimated_revenue DESC, avg_view_count DESC
    ) AS month_timing_rank
FROM base

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}