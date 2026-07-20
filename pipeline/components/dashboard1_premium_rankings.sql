SELECT
    snapshot_month,
    COALESCE(youtube_category_name, 'Uncategorized') AS youtube_category_name,
    premium_quadrant_share,
    avg_recency_weighted_estimated_revenue,
    avg_estimated_revenue,
    avg_estimated_rpm,
    avg_engagement_quality_score,
    avg_view_count,
    premium_category_rank
FROM {{ ref('premium_quadrant_category_rankings') }}

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="youtube_category_name") }}