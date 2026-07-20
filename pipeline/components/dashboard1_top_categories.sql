SELECT
    snapshot_month,
    monetization_quadrant,
    COALESCE(youtube_category_name, 'Uncategorized') AS youtube_category_name,
    avg_recency_weighted_estimated_revenue,
    avg_estimated_rpm,
    monetization_category_rank
FROM {{ ref('monetization_intelligence_summary') }}
WHERE monetization_category_rank <= 10
ORDER BY snapshot_month, monetization_quadrant, monetization_category_rank

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}
{{ with_test("not_null", column="youtube_category_name") }}