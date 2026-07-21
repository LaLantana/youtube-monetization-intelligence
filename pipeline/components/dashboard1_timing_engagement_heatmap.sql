SELECT
    STRFTIME(TRY_CAST(snapshot_date AS TIMESTAMP), '%w') AS day_of_week_number,
    CASE STRFTIME(TRY_CAST(snapshot_date AS TIMESTAMP), '%w')
        WHEN '0' THEN 'Sunday'
        WHEN '1' THEN 'Monday'
        WHEN '2' THEN 'Tuesday'
        WHEN '3' THEN 'Wednesday'
        WHEN '4' THEN 'Thursday'
        WHEN '5' THEN 'Friday'
        WHEN '6' THEN 'Saturday'
    END AS day_of_week_name,
    EXTRACT('hour' FROM TRY_CAST(publish_date AS TIMESTAMP)) AS publish_hour,
    AVG(COALESCE(engagement_quality_score, 0)) AS avg_engagement_quality_score,
    COUNT(*) AS snapshot_count
FROM {{ ref('apply_recency_weighting') }}
WHERE TRY_CAST(publish_date AS TIMESTAMP) IS NOT NULL
GROUP BY
    STRFTIME(TRY_CAST(snapshot_date AS TIMESTAMP), '%w'),
    CASE STRFTIME(TRY_CAST(snapshot_date AS TIMESTAMP), '%w')
        WHEN '0' THEN 'Sunday'
        WHEN '1' THEN 'Monday'
        WHEN '2' THEN 'Tuesday'
        WHEN '3' THEN 'Wednesday'
        WHEN '4' THEN 'Thursday'
        WHEN '5' THEN 'Friday'
        WHEN '6' THEN 'Saturday'
    END,
    EXTRACT('hour' FROM TRY_CAST(publish_date AS TIMESTAMP))
QUALIFY ROW_NUMBER() OVER (
    ORDER BY avg_engagement_quality_score DESC, snapshot_count DESC, day_of_week_number, publish_hour
) <= 10

{{ with_test("count_greater_than", count=0) }}