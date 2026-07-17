SELECT
    snapshot_month,
    content_length_track,
    unique_video_count,
    avg_view_count,
    avg_estimated_revenue,
    avg_recency_weighted_estimated_revenue,
    avg_engagement_quality_score,
    avg_publish_to_trending_lag_hours,
    premium_share,
    viral_fingerprint_share,
    revenue_delta_vs_long_form_baseline,
    view_delta_vs_long_form_baseline,
    engagement_delta_vs_long_form_baseline
FROM {{ ref('short_long_form_comparative_panel') }}

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}