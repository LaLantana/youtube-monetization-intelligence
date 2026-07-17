SELECT
    snapshot_month,
    avg_monthly_platform_health_index,
    avg_estimated_revenue,
    avg_view_count
FROM {{ ref('time_series_trend_intelligence_summary') }}
WHERE content_length_track = 'long_form'
ORDER BY snapshot_month

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}