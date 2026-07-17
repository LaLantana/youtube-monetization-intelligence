SELECT
    ROUND(AVG(monthly_platform_health_index), 2) AS avg_platform_health_index,
    ROUND(AVG(avg_estimated_revenue), 2) AS avg_monthly_estimated_revenue,
    ROUND(AVG(avg_engagement_quality_score), 4) AS avg_engagement_quality_score,
    SUM(unique_video_count) AS total_unique_videos
FROM {{ ref('monthly_platform_health_index') }}

{{ with_test("count_greater_than", count=0) }}