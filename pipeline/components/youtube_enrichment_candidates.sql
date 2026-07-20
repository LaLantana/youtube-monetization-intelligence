{{
    config(
        materialized="table"
    )
}}

SELECT
    video_id,
    publish_date,
    snapshot_date,
    priority_bucket,
    enrichment_priority_rank
FROM (
    SELECT
        trending.video_id,
        TRY_CAST(trending.publish_date AS TIMESTAMP) AS publish_date,
        TRY_CAST(trending.snapshot_date AS TIMESTAMP) AS snapshot_date,
        CASE
            WHEN EXTRACT(YEAR FROM TRY_CAST(trending.publish_date AS TIMESTAMP)) = 2026 THEN 1
            WHEN EXTRACT(YEAR FROM TRY_CAST(trending.publish_date AS TIMESTAMP)) = 2025 THEN 2
            ELSE 3
        END AS priority_bucket,
        ROW_NUMBER() OVER (
            PARTITION BY trending.video_id
            ORDER BY
                CASE
                    WHEN EXTRACT(YEAR FROM TRY_CAST(trending.publish_date AS TIMESTAMP)) = 2026 THEN 1
                    WHEN EXTRACT(YEAR FROM TRY_CAST(trending.publish_date AS TIMESTAMP)) = 2025 THEN 2
                    ELSE 3
                END,
                TRY_CAST(trending.publish_date AS TIMESTAMP) DESC,
                TRY_CAST(trending.snapshot_date AS TIMESTAMP) DESC,
                trending.video_id
        ) AS video_rank,
        ROW_NUMBER() OVER (
            ORDER BY
                CASE
                    WHEN EXTRACT(YEAR FROM TRY_CAST(trending.publish_date AS TIMESTAMP)) = 2026 THEN 1
                    WHEN EXTRACT(YEAR FROM TRY_CAST(trending.publish_date AS TIMESTAMP)) = 2025 THEN 2
                    ELSE 3
                END,
                TRY_CAST(trending.publish_date AS TIMESTAMP) DESC,
                TRY_CAST(trending.snapshot_date AS TIMESTAMP) DESC,
                trending.video_id
        ) AS enrichment_priority_rank
    FROM {{ ref('read_trending_videos_from_motherduck') }} AS trending
) prioritized
WHERE video_rank = 1

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="video_id") }}