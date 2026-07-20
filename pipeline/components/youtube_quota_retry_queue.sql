{{
    config(
        materialized="incremental",
        incremental_strategy="append",
        on_schema_change="append_new_columns",
        retry_strategy=retry_strategy(
            stop_after_attempt=3,
            stop_after_delay=300
        )
    )
}}

SELECT
    run_id,
    processed_at,
    video_id,
    status,
    priority_bucket,
    publish_date,
    snapshot_date,
    quota_units_consumed,
    error_message
FROM {{ ref('read_youtube_video_enrichment') }}
WHERE status IS NOT NULL

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="run_id") }}
{{ with_test("not_null", column="video_id") }}
{{ with_test("not_null", column="status") }}