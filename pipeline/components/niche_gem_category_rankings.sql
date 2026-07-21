WITH monthly_category_metrics AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        COALESCE(youtube_category_name, 'Uncategorized') AS youtube_category_name,
        COUNT(*) AS snapshot_count,
        AVG(CASE WHEN monetization_quadrant = 'niche_gem' THEN 1.0 ELSE 0.0 END) AS niche_gem_quadrant_share,
        AVG(COALESCE(recency_weighted_estimated_revenue, 0)) AS avg_recency_weighted_estimated_revenue,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(estimated_rpm, 0)) AS avg_estimated_rpm,
        AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score,
        AVG(COALESCE(view_count, 0)) AS avg_view_count
    FROM {{ ref('apply_recency_weighting') }}
    GROUP BY
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)),
        COALESCE(youtube_category_name, 'Uncategorized')
), ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY snapshot_month
            ORDER BY niche_gem_quadrant_share DESC, avg_recency_weighted_estimated_revenue DESC, youtube_category_name
        ) AS niche_gem_category_rank
    FROM monthly_category_metrics
)
SELECT
    snapshot_month,
    youtube_category_name,
    snapshot_count,
    niche_gem_quadrant_share,
    avg_recency_weighted_estimated_revenue,
    avg_estimated_revenue,
    avg_estimated_rpm,
    avg_engagement_quality_score,
    avg_view_count,
    niche_gem_category_rank
FROM ranked
WHERE niche_gem_category_rank <= 10

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}
{{ with_test("not_null", column="youtube_category_name") }}