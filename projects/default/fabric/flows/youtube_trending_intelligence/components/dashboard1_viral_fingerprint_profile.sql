SELECT
    snapshot_month,
    viral_fingerprint,
    avg_recency_weighted_estimated_revenue,
    avg_trending_tenure_days,
    avg_country_spread_distinct_count
FROM {{ ref('viral_fingerprint_intelligence_summary') }}
ORDER BY snapshot_month, viral_fingerprint

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}