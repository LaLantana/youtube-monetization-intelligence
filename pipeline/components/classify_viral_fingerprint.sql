WITH base AS (
    SELECT
        *,
        CAST(snapshot_date AS DATE) AS snapshot_day,
        ROW_NUMBER() OVER (
            PARTITION BY video_id
            ORDER BY snapshot_date, country
        ) AS video_day_number,
        COUNT(DISTINCT CAST(snapshot_date AS DATE)) OVER (
            PARTITION BY video_id
        ) AS trending_tenure_days,
        FIRST_VALUE(COALESCE(daily_movement, 0)) OVER (
            PARTITION BY video_id
            ORDER BY snapshot_date, country
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS entry_day_daily_movement,
        MIN(COALESCE(daily_movement, 0)) OVER (
            PARTITION BY video_id
            ORDER BY snapshot_date, country
            ROWS BETWEEN CURRENT ROW AND 3 FOLLOWING
        ) AS min_daily_movement_next_3_days
    FROM {{ ref('derive_trend_movement_features') }}
), classified AS (
    SELECT
        *,
        CASE WHEN COALESCE(daily_movement, 0) >= 33 THEN 1 ELSE 0 END AS viral_fingerprint_rocket_flag,
        CASE WHEN COALESCE(weekly_movement, 0) >= 35 AND trending_tenure_days >= 5 THEN 1 ELSE 0 END AS viral_fingerprint_slow_burner_flag,
        CASE WHEN trending_tenure_days >= 9 THEN 1 ELSE 0 END AS viral_fingerprint_evergreen_flag,
        CASE
            WHEN entry_day_daily_movement >= 33
             AND min_daily_movement_next_3_days <= -20
            THEN 1 ELSE 0
        END AS viral_fingerprint_flash_flag
    FROM base
)
SELECT
    *,
    CASE
        WHEN viral_fingerprint_flash_flag = 1 THEN 'flash'
        WHEN viral_fingerprint_rocket_flag = 1 THEN 'rocket'
        WHEN viral_fingerprint_slow_burner_flag = 1 THEN 'slow_burner'
        WHEN viral_fingerprint_evergreen_flag = 1 THEN 'evergreen'
        ELSE 'none'
    END AS viral_fingerprint
FROM classified

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="video_id") }}
{{ with_test("not_null", column="snapshot_date") }}