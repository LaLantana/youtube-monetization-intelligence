# YouTube Trending Intelligence Pipeline Plan

## Objective

Build a new flow that uses MotherDuck as its data plane, queries YouTube trending data through SQL components, enriches it with YouTube Data API and Google Trends signals, separates short form and long form analysis from the start, and produces monetization-focused intelligence and presentation-ready visual artifacts.

This file is a planning artifact only. No flow implementation is included yet.

## Proposed Flow Name

`youtube_trending_intelligence`

Approved.

## Requested Outcome

Create a production-ready daily pipeline that answers:

- what YouTube currently rewards
- how those reward patterns have shifted over the last 2.5 years
- what those changes imply for revenue optimization today versus two years ago

## Required Source Systems

### 1) MotherDuck primary source and data plane

- Database: `YouTube Trending Videos`
- Table: `trending_videos`
- Current role: primary production source for trending video ingestion
- Flow data plane: MotherDuck
- Access pattern: SQL components executed on the MotherDuck data plane, not YAML read components
- Note: automated daily refresh via Kaggle API remains a planned future enhancement, not the current ingestion path

### 2) YouTube Data API v3

- Endpoint: `https://www.googleapis.com/youtube/v3/videos`
- Required fields to extract from observed live responses:
  - `contentDetails.duration`
  - `snippet.categoryId`
  - `statistics.subscriberCount`
- Constraint: quota tracking and graceful stop before daily quota exhaustion
- Approved quota policy:
  - track quota at daily granularity
  - reset at midnight US/Pacific
  - reserve a 500-unit safety buffer
  - stop enrichment at 9,500 consumed units
  - batch up to 50 `video_id` values per request at 1 unit per request

### 3) Google Trends via `pytrends`

- Used to correlate topic clusters with search interest
- Constraint: inspect live response shape before parser implementation

## Required Planning Principles

- Do not implement any flow code until this plan is explicitly approved.
- Use live API responses from the exact interfaces to determine parser structure.
- Never silently resolve unspecified decisions; flag them before implementation.
- Never reprocess already-ingested rows.
- Never mix short form and long form content in the same downstream analysis.
- Never drop null `video_tags` rows from the main dataset.
- Never use assumed viral fingerprint thresholds; derive them from observed distributions and present them for approval before classification.
- Build and validate upstream components before downstream ones.
- When fixing a broken component, rerun only that component until verified.

## Known Data Quality Constraints To Handle Explicitly

- `langauge` is misspelled and must be fixed explicitly and documented
- null `video_tags` rows must remain in the main dataset and be excluded only from hashtag analysis
- null `langauge` rows must be flagged and retained for non-language analysis
- `kind` contains only one value and must be discarded
- `view_count = 0` rows must be logged and flagged, not silently dropped

## Approved Implementation Decisions

1. Flow name: `youtube_trending_intelligence`
2. Persistent incremental state tables:
   - `pipeline_state`
   - `youtube_quota_retry_queue`
3. YouTube category lookup source:
   - hardcoded dictionary covering the standard global category set
   - unknown category IDs must be flagged, not dropped
4. Topic clustering method:
   - TF-IDF + K-Means
   - start with 25 clusters
   - log inertia and silhouette score for review before downstream topic analysis proceeds
   - first pass limited to English-language content
5. Title sentiment method:
   - VADER from `vaderSentiment`
   - positive if compound ≥ 0.05
   - negative if compound ≤ -0.05
   - neutral otherwise
6. Timezone handling:
   - `pytz`
   - hardcoded country-to-primary-timezone mapping for dataset countries
   - use the most populous timezone for multi-timezone countries
   - default missing mappings to UTC and log a warning
7. Trending source watermark definition:
   - maximum `snapshot_date` already ingested when the run starts
   - pull only rows where `snapshot_date` is strictly greater
   - first run pulls all available rows
8. Quota state persistence:
   - store consumed units and reset date in `pipeline_state`
9. Dashboard artifact structure:
   - Dashboard 1: consolidated Monetization Intelligence Dashboard with internal tabs
   - Dashboard 2: separate Short Form vs. Long Form Comparative Panel
10. Failure alert analysis payload:
    - include failed component name, full error message, and stack trace as Otto analysis context
    - email body must include plain-language diagnosis and specific proposed fix

## Proposed High-Level Architecture

### 1) Ingestion layer

Native SQL source plus downstream transform:

- `read_trending_videos_from_motherduck.sql`
  - query the `trending_videos` table directly on MotherDuck
  - select only the 16 required columns at read time
  - exclude `thumbnail_url` and `kind` at source

- `standardize_trending_videos_quality.py`
  - explicitly fix the `langauge` typo while retaining provenance
  - flag zero-view, null-language, and null-tag rows without dropping them from the main dataset

### 2) Enrichment layer

Custom Python read components:

- `read_youtube_video_enrichment.py`
  - enrich each unique `video_id`
  - capture duration, category ID, category name, and subscriber count
  - maintain quota usage state and deferred retry list for quota-blocked IDs
  - must be built and validated before any content-length filtering transforms

- `read_google_trends_topic_interest.py`
  - enrich topic clusters with Google Trends interest signals
  - inspect live `pytrends` output before parser logic is written
  - handle retries and rate limiting with exponential backoff

### 3) Standardization and data quality layer

Transforms to:

- normalize raw trending source fields into stable internal names
- explicitly rename `langauge` to a corrected analysis field while retaining provenance
- discard `kind`
- flag null-language and zero-view edge cases
- preserve null `video_tags` rows in the main model
- deduplicate or reconcile repeated video snapshots if required by the observed payload

### 4) Content separation layer

This is the mandatory first analytical transform after YouTube enrichment.

Outputs:

- short form dataset: duration under 180 seconds
- long form dataset: duration 180 seconds and above, with duration multiplier classification

Long form duration classes:

- 180–479 seconds → multiplier `1.0`
- 480–599 seconds → multiplier `1.3`
- 600+ seconds → multiplier `1.5`

Short form is routed to a separate analytical path and excluded from all long form transforms.

### 5) Core long form analytical layer

Sequential transforms planned in this order:

1. engagement tiers
2. engagement quality score
3. two-axis monetization quadrant classification
4. estimated revenue
5. viral fingerprint threshold derivation dataset
6. viral fingerprint classification after human review of observed thresholds
7. country spread classification
8. publish-to-trending lag
9. monthly platform health index
10. recency-weighted aggregates

### 6) Insight output layer

Named output tables or views for:

- timing intelligence
- lag intelligence
- title length / sentiment / engagement correlation
- hashtag density analysis
- topic cluster lifecycle analysis
- seasonality analysis
- category monetization rankings
- Premium quadrant category rankings
- Niche Gem category rankings
- diversity growth rankings
- viral fingerprint distribution and revenue comparison
- time-series platform health and engagement trends
- country volatility and language diversity trends
- short form vs long form comparative panel

### 7) Presentation layer

Interactive dashboard artifact(s) intended for hackathon judges, emphasizing:

- current monetization patterns
- then-versus-now comparison over 2.5 years
- practical creator implications

All visualizations will be saved as artifacts in the project.

### 8) Automation layer

New automation files only:

- failure alert automation on flow run failure
- topic spike alert automation on successful flow run

No existing automation files will be modified.

### 9) Otto knowledge layer

New Otto assets to be created after plan approval:

- `otto/rules/monetization_strategy.md`
- `otto/rules/data_quality_youtube.md`
- `otto/rules/api_quota_management.md`
- `otto/rules/incremental_ingestion.md`
- `otto/rules/threshold_derivation.md`
- `otto/commands/learning.md`

## Proposed Component Sequence

### Phase 1 — Live source inspection and design validation

Before writing any component logic:

1. inspect the live primary source interface for the exact dataset payload shape
2. inspect a live YouTube Data API response from the exact videos endpoint
3. inspect a live `pytrends` response for the intended topic-interest method
4. document observed fields, nullability, paging behavior, and retry considerations

Deliverable:

- implementation notes grounded in observed payloads, not documentation summaries

### Phase 2 — Incremental source ingestion

Build and validate:

1. `read_trending_videos_from_motherduck.sql`
2. `standardize_trending_videos_quality.py`

Validation:

- confirm incremental filtering by last successful run date
- confirm schema handling behavior
- confirm zero-view logging behavior
- inspect sample output and row counts

### Phase 3 — YouTube enrichment

Build and validate before any downstream transform:

2. `read_youtube_video_enrichment.py`

Validation:

- confirm observed endpoint field extraction
- confirm duration conversion to seconds
- confirm category mapping output
- confirm subscriber count extraction
- confirm quota tracking and graceful stop behavior
- confirm deferred retry logging for quota-blocked IDs
- confirm `youtube_quota_retry_queue` is created on first run if missing
- confirm `pipeline_state` quota fields reset at midnight US/Pacific

### Phase 4 — Google Trends enrichment

Build and validate:

3. `read_google_trends_topic_interest.py`

Validation:

- confirm observed pytrends output parsing
- confirm retry and rate-limit behavior
- inspect sample rows and schema

### Phase 5 — Core standardization and data quality transforms

Build iteratively and validate each before moving on:

4. raw standardization transform
5. explicit `langauge` correction and data quality flag transform
6. content-length separation transform
7. English-language topic-analysis eligibility transform

Validation:

- verify `kind` is removed
- verify null-language flags are retained
- verify null-tag rows remain in the main dataset
- verify short form and long form are fully separated

### Phase 6 — Long form monetization transforms

Build iteratively and validate each in order:

8. engagement tiers
9. engagement quality score
10. Premium / Passive / Niche Gem / Skip classification
11. estimated revenue with RPM lookup and duration multipliers

Validation:

- inspect boundary cases for each view-count tier
- inspect engagement score calculations on sample rows
- inspect category-to-RPM mapping including Uncategorized fallback
- verify no short form rows are present

### Phase 7 — Viral fingerprint derivation and approval gate

Build derivation outputs first:

12. trend movement feature transform
13. threshold derivation summary outputs

Mandatory pause:

- present observed distributions for `daily_movement`, `weekly_movement`, and consecutive trending tenure for review
- do not build final fingerprint classification until explicit approval is provided on derived thresholds

After approval:

14. viral fingerprint classification transform

Approved observed data-derived thresholds for viral fingerprint classification:

- Rocket: `daily_movement >= 33` on any single day
- Slow Burner: `weekly_movement >= 35` and trending tenure `>= 5` days
- Evergreen: trending tenure `>= 9` days
- Flash: `daily_movement >= 33` on entry day and `daily_movement <= -20` within the following 3 days

### Phase 8 — Remaining analytical transforms

Build iteratively and validate each:

15. country spread classification
16. publish-to-trending lag with timezone-aware handling
17. monthly platform health index
18. recency weighting layer

Validation:

- inspect classification boundaries
- inspect lag calculations across multiple countries/timezones
- inspect monthly aggregation logic and weighting outputs

### Phase 9 — Insight tables and views

Build named outputs for the required analysis questions grouped into:

- timing intelligence
- content intelligence
- monetization intelligence
- viral fingerprint intelligence
- time-series trend intelligence
- short form vs long form comparative panel

Validation:

- confirm each output uses the required scope window
- confirm top-N output counts
- confirm hashtag analysis excludes only null-tag rows and nothing else
- confirm short form comparison uses the special short form revenue formula only in that panel
- confirm topic-cluster downstream outputs do not proceed until inertia and silhouette metrics are reviewed

### Phase 10 — Dashboard artifacts

Build interactive artifact(s) after the analytical outputs exist.

Validation:

- confirm the narrative emphasizes current state vs change over time
- confirm Fabric query execution is sequential
- confirm a refresh button is always visible
- confirm visualizations are presentation-ready for non-data-engineer judges

### Phase 11 — Production readiness review

Review all read components and time-window logic for hardcoded dates or stale logic.

Validation sequence:

- re-run each fixed read component individually if changes are needed
- after all components are individually validated, run the full flow once end to end

### Phase 12 — Intelligent alerting and Otto assets

Build:

18. new flow failure automation YAML
19. new topic spike automation YAML
20. requested Otto rules and learning command

Validation:

- confirm automation files are new and separate
- confirm alert payloads include all requested fields
- confirm Otto rules capture only prompt-specified guidance and observed implementation learnings

## Proposed Output Families

### Base operational outputs

- raw incremental trending dataset
- video enrichment dataset
- Google Trends topic enrichment dataset
- standardized master snapshot dataset
- short form comparison dataset
- long form analytical base dataset

### Derived analytical outputs

- engagement tier summary outputs
- monetization quadrant outputs
- category revenue ranking outputs
- fingerprint derivation outputs
- fingerprint classification outputs
- country spread outputs
- publish lag outputs
- monthly platform health outputs
- recency-weighted trend outputs
- topic lifecycle and seasonality outputs

### Dashboard-serving outputs

- current-state KPIs
- then-vs-now comparison metrics
- top-N ranking tables
- comparative short-form panel outputs

## Validation Strategy

- Validate each upstream component before any downstream dependency is built.
- Use live source responses as parser truth.
- After each component is built, inspect schema, row counts, and representative sample values.
- If a component fails, rerun only that component after the fix.
- Do not run the full flow until all components are individually validated.
- Pause at the viral fingerprint threshold review gate for explicit human approval before applying classifications.
- After 50 actions during implementation, provide a progress summary before continuing.

## Explicit Decisions / Ambiguities Requiring Review Before Implementation

These items are not fully specified in the prompt and should be confirmed before implementation proceeds:

1. **Flow naming**
   - Proposed: `youtube_trending_intelligence`

2. **Storage pattern for incremental state**
   - The prompt requires filtering by last successful run date and retrying quota-blocked records, but does not prescribe whether state should be tracked via component output tables alone, helper tables, or other persisted flow datasets.

3. **YouTube category lookup source**
   - The prompt requires mapping category IDs to names but does not specify whether this should come from the YouTube category API, a maintained lookup table derived from live API output, or another approved source.

4. **Topic clustering method**
   - The prompt requires topic clusters from `video_tags` and `title`, but does not specify the clustering algorithm or rule-based approach.

5. **Title sentiment method**
   - The prompt requires sentiment analysis but does not specify the sentiment model or lexicon.

6. **Timezone reference dataset for 113 countries**
   - The prompt requires timezone-aware publish-to-trending lag, but does not specify the country-to-timezone mapping source when a country spans multiple timezones.

7. **Definition of last successful run date for Kaggle incremental ingestion**
   - The prompt requires filtering by the last successful run date, but does not state whether this means flow run completion date, maximum ingested `snapshot_date`, or another persisted watermark.

8. **Quota persistence granularity for YouTube API tracking**
   - The prompt requires daily quota tracking and deferred retry, but does not specify the persisted grain for quota logs.

9. **Expected artifact structure**
   - The prompt requires saving all visualizations as artifacts, but does not specify whether this should be one consolidated dashboard artifact or multiple focused artifacts.

10. **Failure alert root cause analysis mechanism**
    - The prompt requires Otto root cause analysis and proposed fix in the alert, but does not specify whether that analysis should come from automation-side logic, a helper component, or another supported runtime pattern.

## Approval Gate

Implementation should not begin until this plan is explicitly approved.