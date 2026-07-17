WITH base AS (
    SELECT
        *,
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        MAX(DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP))) OVER () AS max_snapshot_month
    FROM {{ ref('publish_to_trending_lag') }}
), weighted AS (
    SELECT
        *,
        DATEDIFF('month', snapshot_month, max_snapshot_month) AS months_from_latest,
        EXP(-0.15 * DATEDIFF('month', snapshot_month, max_snapshot_month)) AS recency_weight
    FROM base
)
SELECT
    *,
    COALESCE(view_count, 0) * recency_weight AS recency_weighted_view_count,
    COALESCE(estimated_revenue, 0) * recency_weight AS recency_weighted_estimated_revenue,
    COALESCE(engagement_quality_score, 0) * recency_weight AS recency_weighted_engagement_quality_score,
    COALESCE(trend_movement_momentum, 0) * recency_weight AS recency_weighted_trend_movement_momentum,
    CASE
        WHEN recency_weight >= 0.85 THEN 'current_window'
        WHEN recency_weight >= 0.6 THEN 'recent_window'
        WHEN recency_weight >= 0.35 THEN 'mid_window'
        ELSE 'historical_window'
    END AS recency_weight_band
FROM weighted
{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="video_id") }}
{{ with_test("not_null", column="snapshot_date") }}