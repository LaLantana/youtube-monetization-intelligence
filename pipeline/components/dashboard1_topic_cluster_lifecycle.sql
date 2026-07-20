SELECT
    snapshot_month,
    topic_cluster,
    avg_recency_weighted_estimated_revenue,
    topic_revenue_momentum,
    topic_cluster_trend,
    rising_topic_rank,
    declining_topic_rank
FROM {{ ref('topic_cluster_lifecycle_analysis') }}

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="topic_cluster") }}