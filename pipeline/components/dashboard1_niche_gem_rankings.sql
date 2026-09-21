SELECT
    summary.snapshot_month,
    COALESCE(summary.youtube_category_name, 'Uncategorized') AS youtube_category_name,
    rankings.niche_gem_quadrant_share,
    summary.avg_recency_weighted_estimated_revenue,
    summary.avg_estimated_revenue,
    summary.avg_estimated_rpm,
    summary.avg_engagement_quality_score,
    summary.avg_view_count,
    rankings.niche_gem_category_rank
FROM {{ ref('niche_gem_category_rankings') }} AS rankings
LEFT JOIN {{ ref('monetization_intelligence_summary') }} AS summary
    ON rankings.snapshot_month = summary.snapshot_month
   -- The rankings side labels unenriched videos 'Uncategorized' while the summary
   -- side keeps a true NULL, so a plain equality silently dropped every
   -- Uncategorized row. Normalize both sides before comparing.
   AND rankings.youtube_category_name = COALESCE(summary.youtube_category_name, 'Uncategorized')
   AND summary.monetization_quadrant = 'niche_gem'

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="youtube_category_name") }}