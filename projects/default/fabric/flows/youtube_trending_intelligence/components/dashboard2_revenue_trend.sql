SELECT
    snapshot_month,
    content_length_track,
    avg_estimated_revenue,
    avg_recency_weighted_estimated_revenue
FROM {{ ref('short_long_form_comparative_panel') }}
ORDER BY snapshot_month, content_length_track

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}