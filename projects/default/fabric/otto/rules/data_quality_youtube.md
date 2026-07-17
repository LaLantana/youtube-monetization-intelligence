# YouTube Data Quality

Use this rule when reviewing or modifying #flow:youtube_trending_intelligence.

## Required Handling

- Explicitly preserve null `video_tags` rows in the main dataset
- Explicitly retain and flag null language values
- Preserve zero-view rows and flag them instead of dropping them
- Treat the source typo `langauge` as a documented correction path, not an implicit rename
- Treat YouTube enrichment as an additive enrichment path layered onto the retained master trending dataset, not as a row-level eligibility filter
- When validating enrichment joins, preserve all upstream trending rows and verify row counts before and after the join remain unchanged

## Proven Validated Components

- #component:standardize_trending_videos_quality
- #component:correct_language_and_quality_flags
- #component:standardize_enriched_trending_videos

## Reporting Guidance

- When discussing language-based downstream analysis, state that English-only eligibility is a first-pass constraint
- When discussing topic or hashtag work, clarify that exclusion applies only to the specific analysis path, not the retained master dataset

## Validated Enrichment Findings

- `#component:transform_youtube_enrichment` uses a left join from `#component:standardize_trending_videos_quality` to processed enrichment rows only
- The validated join pattern filters enrichment inputs to `status = "processed"` before joining on `video_id`
- Validated row-count comparison showed no multiplication across the enrichment join:
  - before join: `5,013,692` rows
  - after join: `5,013,692` rows
- Validated duplication check showed no `video_id` duplication introduced by the enrichment join

## Investigative Guidance

- When monetization or viral-fingerprint revenue shifts sharply after enrichment changes, test fallback-rate changes before assuming join defects
- Compare row counts at `#component:standardize_trending_videos_quality` and `#component:transform_youtube_enrichment`
- Check whether post-join row counts exceed distinct `video_id` + `snapshot_date` counts before attributing anomalies to duplication