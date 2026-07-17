# Incremental Ingestion

Use this rule when planning production-readiness work for #flow:youtube_trending_intelligence.

## Current State

- Source ingestion currently reads the full MotherDuck table
- The incremental watermark is intentionally deferred to production-readiness work

## Approved Watermark Definition

- Use the maximum `snapshot_date` already ingested when the run starts
- Pull only source rows with `snapshot_date` strictly greater than that watermark
- Allow the first run to ingest all available rows

## Guardrails

- Do not add incremental logic mid-stream to already validated downstream transforms unless required by production-readiness review
- Keep changes localized to the source ingestion path and dependent state handling