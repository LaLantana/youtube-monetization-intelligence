SELECT
    snapshot_month,
    country_code,
    language_diversity_score,
    language_diversity_growth,
    fastest_diversity_growth_rank
FROM {{ ref('country_volatility_language_diversity_trends') }}
WHERE country_trend_classification = 'fastest_diversity_growth'

{{ with_test("count_greater_than", count=0) }}
{{ with_test("not_null", column="country_code") }}