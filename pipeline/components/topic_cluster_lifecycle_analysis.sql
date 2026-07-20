WITH eligible_rows AS (
    SELECT
        DATE_TRUNC('month', TRY_CAST(snapshot_date AS TIMESTAMP)) AS snapshot_month,
        TRIM(LOWER(COALESCE(video_tags, title, 'untagged'))) AS raw_topic_source,
        COALESCE(view_count, 0) AS view_count,
        COALESCE(estimated_revenue, 0) AS estimated_revenue,
        COALESCE(recency_weighted_estimated_revenue, 0) AS recency_weighted_estimated_revenue
    FROM {{ ref('apply_recency_weighting') }}
    WHERE english_topic_analysis_eligible = 1
), normalized_topics AS (
    SELECT
        snapshot_month,
        CASE
            WHEN raw_topic_source = '' THEN 'untagged'
            WHEN STRPOS(raw_topic_source, '|') > 0 THEN SPLIT_PART(raw_topic_source, '|', 1)
            WHEN STRPOS(raw_topic_source, ',') > 0 THEN SPLIT_PART(raw_topic_source, ',', 1)
            ELSE raw_topic_source
        END AS topic_cluster,
        view_count,
        estimated_revenue,
        recency_weighted_estimated_revenue
    FROM eligible_rows
), monthly_cluster_metrics AS (
    SELECT
        snapshot_month,
        topic_cluster,
        COUNT(*) AS snapshot_count,
        AVG(view_count) AS avg_view_count,
        AVG(estimated_revenue) AS avg_estimated_revenue,
        AVG(recency_weighted_estimated_revenue) AS avg_recency_weighted_estimated_revenue
    FROM normalized_topics
    GROUP BY snapshot_month, topic_cluster
), month_over_month AS (
    SELECT
        *,
        avg_recency_weighted_estimated_revenue - LAG(avg_recency_weighted_estimated_revenue) OVER (
            PARTITION BY topic_cluster
            ORDER BY snapshot_month
        ) AS topic_revenue_momentum,
        avg_view_count - LAG(avg_view_count) OVER (
            PARTITION BY topic_cluster
            ORDER BY snapshot_month
        ) AS topic_view_momentum
    FROM monthly_cluster_metrics
), ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY snapshot_month
            ORDER BY topic_revenue_momentum DESC, avg_recency_weighted_estimated_revenue DESC
        ) AS rising_topic_rank,
        ROW_NUMBER() OVER (
            PARTITION BY snapshot_month
            ORDER BY topic_revenue_momentum ASC, avg_recency_weighted_estimated_revenue DESC
        ) AS declining_topic_rank
    FROM month_over_month
    WHERE topic_revenue_momentum IS NOT NULL
)
SELECT
    snapshot_month,
    topic_cluster,
    snapshot_count,
    avg_view_count,
    avg_estimated_revenue,
    avg_recency_weighted_estimated_revenue,
    topic_revenue_momentum,
    topic_view_momentum,
    CASE
        WHEN rising_topic_rank <= 10 THEN 'rising'
        WHEN declining_topic_rank <= 10 THEN 'declining'
        ELSE 'stable'
    END AS topic_cluster_trend,
    rising_topic_rank,
    declining_topic_rank
FROM ranked
WHERE rising_topic_rank <= 10 OR declining_topic_rank <= 10

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="snapshot_month") }}
{{ with_test("not_null", column="topic_cluster") }}