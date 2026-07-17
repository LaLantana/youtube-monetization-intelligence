# Otto's Expeditions

A sample Ascend project for the fictional Otto's Expeditions enterprise, demonstrating multi-platform data pipelines across BigQuery, Databricks, DuckDB, MotherDuck, and Snowflake.

## Project Structure

| Directory | Description |
|-----------|-------------|
| `automations/` | Event-driven and scheduled workflow triggers |
| `connections/` | Data plane and source connections |
| `data/` | Local CSV files for testing |
| `flows/` | Data pipelines organized by platform |
| `macros/` | Reusable Jinja SQL templates |
| `otto/` | AI agent configuration and customization |
| `profiles/` | Environment-specific parameters |
| `src/` | Shared Python modules |
| `templates/` | Simple Application templates |
| `vaults/` | External credential stores |

## Flows by Platform

Each platform has a consistent set of flows:

- **Extract-Load**: Ingest data from GCS and local files
- **Transform**: Business logic transformations
- **Metrics**: Aggregated analytics

Platforms: #flow:extract-load-bigquery, #flow:extract-load-databricks, #flow:extract-load-duckdb, #flow:extract-load-snowflake, #flow:extract-load-motherduck

## Featured Project Flows

- #flow:weather_carbon_optimization — operational optimization and executive dashboard example
- #flow:youtube_trending_intelligence — YouTube monetization intelligence pipeline on MotherDuck with enrichment, monetization scoring, viral fingerprinting, comparative panels, and dashboard-ready summary outputs

## YouTube Intelligence Artifacts

Validated summary outputs for #flow:youtube_trending_intelligence include:

- #component:timing_intelligence_summary
- #component:monetization_intelligence_summary
- #component:viral_fingerprint_intelligence_summary
- #component:content_intelligence_summary
- #component:time_series_trend_intelligence_summary
- #component:short_long_form_comparative_panel

Quota-aware enrichment support components:

- #component:youtube_enrichment_candidates
- #component:youtube_quota_retry_queue

The YouTube enrichment reader now prioritizes unenriched 2025-2026 videos first, derives its daily worklist from trending source rows plus the processed-ID queue log, processes up to the 9,500 daily YouTube Data API unit guardrail, and logs processed/deferred video IDs for daily retry management.

Dashboard application files:

- @applications/youtube-monetization-intelligence-dashboard-Q1w2e3/youtube-monetization-intelligence-dashboard.tsx
- @applications/youtube-short-vs-long-panel-R4t5y6/youtube-short-vs-long-panel.tsx

## Getting Started

1. Create a workspace with an appropriate profile from `profiles/`
2. Configure your data plane connection parameters
3. Run the extract-load flow for your platform
4. Run the transform flow to process the data

## Python Dependencies

Project-managed Python packages are declared in @ascend_project.yaml via `project.pip_packages`.

Current additional runtime packages include:

- `pytrends` for Google Trends enrichment
- `vaderSentiment` for title sentiment analysis