WITH monthly_channel_counts AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        channel_id,
        COUNT(*) AS channel_snapshot_count
    FROM {{ ref('apply_recency_weighting') }}
    GROUP BY 1, 2
), ranked AS (
    SELECT
        snapshot_month,
        channel_id,
        channel_snapshot_count,
        ROW_NUMBER() OVER (
            PARTITION BY snapshot_month
            ORDER BY channel_snapshot_count DESC
        ) AS channel_rank,
        SUM(channel_snapshot_count) OVER (PARTITION BY snapshot_month) AS total_monthly_snapshots
    FROM monthly_channel_counts
)
SELECT
    snapshot_month,
    SUM(CASE WHEN channel_rank <= 100 THEN channel_snapshot_count ELSE 0 END) * 1.0
        / NULLIF(MAX(total_monthly_snapshots), 0) AS concentration_score
FROM ranked
GROUP BY snapshot_month
ORDER BY snapshot_month

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}