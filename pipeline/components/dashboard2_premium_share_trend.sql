SELECT
    snapshot_month,
    content_length_track,
    premium_share,
    viral_fingerprint_share
FROM {{ ref('short_long_form_comparative_panel') }}
ORDER BY snapshot_month, content_length_track

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}