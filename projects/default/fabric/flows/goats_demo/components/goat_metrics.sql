SELECT
    id,
    name,
    breed,
    route,
    age,
    weight_lbs,
    pack_capacity_lbs,
    trips_completed,
    daily_rate,
    total_revenue_ytd,
    customer_rating,
    maintenance_cost_ytd,
    total_revenue_ytd - maintenance_cost_ytd AS net_revenue_ytd,
    CASE
        WHEN health_score >= 9 THEN 'elite'
        WHEN health_score >= 7 THEN 'strong'
        ELSE 'monitor'
    END AS readiness_tier,
    CASE
        WHEN days_rested >= 3 THEN 1
        ELSE 0
    END AS ready_for_dispatch
FROM {{ ref('read_goats') }}

{{ with_test("not_null", column="id") }}
{{ with_test("unique", column="id") }}
{{ with_test("count_greater_than", count=0) }}