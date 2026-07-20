WITH monthly_rollup AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        COUNT(*) AS trending_snapshot_count,
        COUNT(DISTINCT video_id) AS unique_video_count,
        COUNT(DISTINCT channel_id) AS unique_channel_count,
        AVG(COALESCE(view_count, 0)) AS avg_view_count,
        AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(trend_movement_momentum, 0)) AS avg_trend_movement_momentum,
        AVG(COALESCE(country_spread_distinct_count, 0)) AS avg_country_spread_distinct_count,
        AVG(COALESCE(publish_to_trending_lag_hours, 0)) AS avg_publish_to_trending_lag_hours,
        AVG(CASE WHEN content_length_track = 'long_form' THEN 1.0 ELSE 0.0 END) AS long_form_share,
        AVG(CASE WHEN monetization_quadrant = 'premium' THEN 1.0 ELSE 0.0 END) AS premium_share,
        AVG(CASE WHEN monetization_quadrant = 'niche_gem' THEN 1.0 ELSE 0.0 END) AS niche_gem_share,
        AVG(CASE WHEN viral_fingerprint IN ('rocket', 'slow_burner', 'evergreen', 'flash') THEN 1.0 ELSE 0.0 END) AS viral_fingerprint_share,
        AVG(CASE WHEN market_timezone_fallback_flag = 1 THEN 1.0 ELSE 0.0 END) AS timezone_fallback_share
    FROM {{ ref('publish_to_trending_lag') }}
    GROUP BY DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP))
), scored AS (
    SELECT
        *,
        (
            (avg_engagement_quality_score * 0.25) +
            (premium_share * 0.2) +
            (niche_gem_share * 0.1) +
            (viral_fingerprint_share * 0.15) +
            (long_form_share * 0.05) +
            (avg_trend_movement_momentum / NULLIF(ABS(avg_trend_movement_momentum) + 100.0, 0) * 0.1) +
            (avg_country_spread_distinct_count / NULLIF(avg_country_spread_distinct_count + 5.0, 0) * 0.1) +
            ((1.0 - timezone_fallback_share) * 0.05)
        ) * 100.0 AS monthly_platform_health_index
    FROM monthly_rollup
)
SELECT
    snapshot_month,
    trending_snapshot_count,
    unique_video_count,
    unique_channel_count,
    avg_view_count,
    avg_engagement_quality_score,
    avg_estimated_revenue,
    avg_trend_movement_momentum,
    avg_country_spread_distinct_count,
    avg_publish_to_trending_lag_hours,
    long_form_share,
    premium_share,
    niche_gem_share,
    viral_fingerprint_share,
    timezone_fallback_share,
    monthly_platform_health_index,
    CASE
        WHEN monthly_platform_health_index >= 20 THEN 'strong'
        WHEN monthly_platform_health_index >= 10 THEN 'healthy'
        WHEN monthly_platform_health_index >= 0 THEN 'mixed'
        ELSE 'soft'
    END AS monthly_platform_health_band
FROM scored

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}