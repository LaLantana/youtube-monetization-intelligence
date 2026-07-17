# API Quota Management

Use this rule when discussing YouTube Data API or Google Trends enrichment in #flow:youtube_trending_intelligence.

## YouTube Data API Constraints

- Track quota at daily granularity
- Reserve a 500-unit safety buffer
- Stop enrichment at 9,500 consumed units
- Batch up to 50 `video_id` values per request

## Google Trends Guidance

- Keep validation requests narrow when rate limits appear
- Prefer slower retry pacing and smaller scopes over aggressive retries
- Treat 429 behavior as a signal to reduce request breadth first

## Implementation Notes

- The currently validated YouTube enrichment read is still in validation mode, not full upstream-driven production mode
- Quota-aware production enrichment changes should be reviewed carefully before replacing the validated split pattern
- Early enrichment coverage can remain extremely low even when the build and join logic are healthy; distinguish quota-limited coverage from data-pipeline defects
- When coverage is quota-limited, expect monetization metrics to remain dominated by default RPM fallback until enough processed enrichment accumulates