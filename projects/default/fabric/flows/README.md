# Flows

Data pipelines organized by platform.

## Platform Directories

| Platform | Flows |
|----------|-------|
| `bigquery/` | #flow:extract-load-bigquery, #flow:transform-bigquery, #flow:metrics-bigquery |
| `databricks/` | #flow:extract-load-databricks, #flow:transform-databricks, #flow:metrics-databricks, #flow:pyspark-databricks |
| `duckdb/` | #flow:extract-load-duckdb, #flow:transform-duckdb, #flow:metrics-duckdb, #flow:jaffle_shop, #flow:extract-load-duckdb-postgres, #flow:transform-duckdb-postgres, #flow:metrics-duckdb-postgres |
| `motherduck/` | #flow:extract-load-motherduck, #flow:transform-motherduck, #flow:metrics-motherduck |
| `snowflake/` | #flow:extract-load-snowflake, #flow:transform-snowflake, #flow:metrics-snowflake, #flow:llm-snowflake |

## Flow Pattern

Each platform follows a consistent pattern:

1. **Extract-Load**: Ingest raw data from GCS and local files
2. **Transform**: Apply business logic and data quality rules
3. **Metrics**: Generate aggregated analytics and KPIs

## Cross-Platform Compatibility

SQL components use Jinja macros from `macros/` for dialect-agnostic transformations where possible.

## Project Flows

- #flow:sales — sales ingestion and transformation examples
- #flow:goats_demo — local-file demo flow
- #flow:weather_carbon_optimization — operational carbon optimization and dashboarding
- #flow:youtube_trending_intelligence — incremental YouTube trending intelligence for monetization analysis

## YouTube Trending Intelligence Outputs

Validated analytical outputs for #flow:youtube_trending_intelligence:

- #component:monthly_platform_health_index
- #component:apply_recency_weighting
- #component:timing_intelligence_summary
- #component:monetization_intelligence_summary
- #component:viral_fingerprint_intelligence_summary
- #component:content_intelligence_summary
- #component:time_series_trend_intelligence_summary
- #component:short_long_form_comparative_panel