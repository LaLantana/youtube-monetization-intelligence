WITH category_lag AS (
    SELECT
        COALESCE(youtube_category_name, 'Uncategorized') AS youtube_category_name,
        AVG(COALESCE(publish_to_trending_lag_hours, 0)) AS avg_publish_to_trending_lag_hours,
        COUNT(*) AS snapshot_count,
        ROW_NUMBER() OVER (
            ORDER BY AVG(COALESCE(publish_to_trending_lag_hours, 0)) ASC
        ) AS fastest_rank,
        ROW_NUMBER() OVER (
            ORDER BY AVG(COALESCE(publish_to_trending_lag_hours, 0)) DESC
        ) AS slowest_rank
    FROM {{ ref('apply_recency_weighting') }}
    GROUP BY COALESCE(youtube_category_name, 'Uncategorized')
)
SELECT
    youtube_category_name,
    avg_publish_to_trending_lag_hours,
    snapshot_count,
    CASE
        WHEN fastest_rank <= 10 THEN 'fastest'
        WHEN slowest_rank <= 10 THEN 'slowest'
        ELSE 'other'
    END AS lag_speed_group,
    fastest_rank,
    slowest_rank
FROM category_lag
WHERE fastest_rank <= 10 OR slowest_rank <= 10

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="youtube_category_name") }}