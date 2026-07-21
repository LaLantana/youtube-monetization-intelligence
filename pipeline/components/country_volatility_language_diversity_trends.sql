WITH monthly_country_metrics AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        COALESCE(country_code, 'unknown') AS country_code,
        COUNT(*) AS snapshot_count,
        COUNT(DISTINCT video_id) AS unique_video_count,
        COUNT(DISTINCT COALESCE(corrected_language, 'missing')) AS distinct_language_count,
        AVG(COALESCE(view_count, 0)) AS avg_view_count,
        AVG(COALESCE(estimated_revenue, 0)) AS avg_estimated_revenue,
        AVG(COALESCE(recency_weighted_estimated_revenue, 0)) AS avg_recency_weighted_estimated_revenue,
        AVG(COALESCE(trend_movement_momentum, 0)) AS avg_trend_movement_momentum,
        AVG(COALESCE(country_spread_distinct_count, 0)) AS avg_country_spread_distinct_count
    FROM {{ ref('apply_recency_weighting') }}
    GROUP BY
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)),
        COALESCE(country_code, 'unknown')
), enriched AS (
    SELECT
        *,
        distinct_language_count * 1.0 / NULLIF(unique_video_count, 0) AS language_diversity_score,
        AVG(avg_view_count) OVER (PARTITION BY country_code) AS country_avg_view_count,
        STDDEV_SAMP(avg_view_count) OVER (PARTITION BY country_code) AS country_view_volatility,
        AVG(avg_recency_weighted_estimated_revenue) OVER (PARTITION BY country_code) AS country_avg_weighted_revenue,
        language_diversity_score - LAG(language_diversity_score) OVER (
            PARTITION BY country_code
            ORDER BY snapshot_month
        ) AS language_diversity_growth
    FROM monthly_country_metrics
), ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY snapshot_month
            ORDER BY country_view_volatility DESC, country_avg_weighted_revenue DESC, country_code
        ) AS most_volatile_country_rank,
        ROW_NUMBER() OVER (
            PARTITION BY snapshot_month
            ORDER BY country_view_volatility ASC, country_avg_weighted_revenue DESC, country_code
        ) AS most_stable_country_rank,
        ROW_NUMBER() OVER (
            PARTITION BY snapshot_month
            ORDER BY language_diversity_growth DESC, language_diversity_score DESC, country_code
        ) AS fastest_diversity_growth_rank
    FROM enriched
    WHERE language_diversity_growth IS NOT NULL
)
SELECT
    snapshot_month,
    country_code,
    snapshot_count,
    unique_video_count,
    distinct_language_count,
    avg_view_count,
    avg_estimated_revenue,
    avg_recency_weighted_estimated_revenue,
    avg_trend_movement_momentum,
    avg_country_spread_distinct_count,
    language_diversity_score,
    country_view_volatility,
    language_diversity_growth,
    CASE
        WHEN most_volatile_country_rank <= 10 THEN 'most_volatile'
        WHEN most_stable_country_rank <= 10 THEN 'most_stable'
        WHEN fastest_diversity_growth_rank <= 10 THEN 'fastest_diversity_growth'
        ELSE 'unranked'
    END AS country_trend_classification,
    most_volatile_country_rank,
    most_stable_country_rank,
    fastest_diversity_growth_rank
FROM ranked
WHERE most_volatile_country_rank <= 10
   OR most_stable_country_rank <= 10
   OR fastest_diversity_growth_rank <= 10

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}
{{ with_test("not_null", column="country_code") }}