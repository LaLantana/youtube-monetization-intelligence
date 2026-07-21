WITH base AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        content_length_track,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT video_id) AS unique_video_count,
        AVG(COALESCE(view_count, 0)) AS avg_view_count,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(recency_weighted_estimated_revenue, 0)) AS avg_recency_weighted_estimated_revenue,
        AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score,
        AVG(COALESCE(publish_to_trending_lag_hours, 0)) AS avg_publish_to_trending_lag_hours,
        AVG(COALESCE(country_spread_distinct_count, 0)) AS avg_country_spread_distinct_count,
        AVG(CASE WHEN monetization_quadrant = 'premium' THEN 1.0 ELSE 0.0 END) AS premium_share,
        AVG(CASE WHEN viral_fingerprint IN ('rocket', 'slow_burner', 'evergreen', 'flash') THEN 1.0 ELSE 0.0 END) AS viral_fingerprint_share
    FROM {{ ref('apply_recency_weighting') }}
    GROUP BY
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)),
        content_length_track
)
SELECT
    *,
    avg_estimated_revenue - FIRST_VALUE(avg_estimated_revenue) OVER (
        PARTITION BY snapshot_month
        ORDER BY CASE WHEN content_length_track = 'long_form' THEN 0 ELSE 1 END, content_length_track
    ) AS revenue_delta_vs_long_form_baseline,
    avg_view_count - FIRST_VALUE(avg_view_count) OVER (
        PARTITION BY snapshot_month
        ORDER BY CASE WHEN content_length_track = 'long_form' THEN 0 ELSE 1 END, content_length_track
    ) AS view_delta_vs_long_form_baseline,
    avg_engagement_quality_score - FIRST_VALUE(avg_engagement_quality_score) OVER (
        PARTITION BY snapshot_month
        ORDER BY CASE WHEN content_length_track = 'long_form' THEN 0 ELSE 1 END, content_length_track
    ) AS engagement_delta_vs_long_form_baseline
FROM base

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}