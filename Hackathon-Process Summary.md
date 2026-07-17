# **Hackathon Process Summary — YouTube Trending Intelligence Pipeline**

## **Phase 1 — Dataset Selection**

**Goal:** Find a suitable dataset for the hackathon.

**Process:** Evaluated multiple datasets:

* **Overtone app data** — friend's CEO provided access to their user analytics dashboard, but only 2 weeks of data existed as they had just started tracking metrics. Ruled out.  
* **Spotify Million Playlist Dataset** — no longer publicly available for direct download; requires reaching out to Spotify Research directly. Ruled out.  
* **Instagram Media Metadata** — appeared promising until sanity checks revealed 78% of rows (903 of 1,152) belonged to a single creator (Keke Palmer). Ruled out.  
* **Monthly Top 50 Social Media Accounts** — follower counts and rankings only, no post-level engagement data. Not suitable for autonomous agent intelligence. Ruled out.  
* **YouTube Trending Videos (113 countries)** — 5,019,235 rows, 18 columns, daily updates, Kaggle usability score of 10, date range October 2023 to present. Selected.

**Sanity checks performed directly in Kaggle notebook:**

* File path discovery using os.walk  
* Column name verification (revealed langauge typo)  
* Creator distribution check  
* Date range validation  
* Engagement overview using describe()  
* Missing value analysis

**Solution:** Settled on Kaggle's YouTube Trending Videos dataset after confirming 113 unique countries, good content type mix, zero missing values on key engagement columns, and no creator concentration problem.

---

## **Phase 2 — Pipeline Design**

**Goal:** Design a comprehensive analytics pipeline with clear monetization focus.

**Process:** Defined all analytical frameworks across many iterations:

* Engagement tiers (percentile-based on view\_count)  
* Two-axis engagement quality classification (Premium, Passive, Niche Gem, Skip)  
* Engagement Quality Score formula: (like\_count \+ comment\_count × 5\) ÷ view\_count  
* Viral fingerprint classifications (Rocket, Slow Burner, Evergreen, Flash) — noted as project-defined, not industry-standard  
* Estimated revenue formula with RPM lookup table and duration multipliers  
* Platform Health Index (Volatility, Concentration, Diversity, Barrier to Entry)  
* Country spread classification (Global, Regional, Local)  
* Niche classification (High-Value Niche, Mid-Tier, Mass Market)  
* Data recency weighting (2025-2026: 1.0, 2024: 0.6, 2023: 0.3)  
* Short form vs. long form content filter with separate treatment  
* Content length thresholds (180s, 480s, 600s)

**Key decisions made:**

* Comment multiplier set to 5 (not 10\) reflecting algorithmic amplification value rather than community building, given monetization focus  
* BERTopic considered for topic clustering but rejected in favour of TF-IDF \+ K-Means due to time and token cost constraints — BERTopic noted as future enhancement  
* Two separate dashboard artifacts agreed (primary Monetization Intelligence Dashboard \+ Short Form vs. Long Form Comparative Panel)  
* Engagement formula reasoning deliberately excluded from build prompt — relevant only to future autonomous agent, not Otto

**Output:** Comprehensive pre-build summary (v2) documenting all thresholds, business constants, insight categories, Otto rules, pipeline architecture, and post-build verification checklist.

---

## **Phase 2b — Build Prompt Creation**

**Goal:** Draft a comprehensive build prompt following all 18 bootcamp prompting techniques.

**Process:**

* Analyzed both bootcamp files — Ascend\_Bootcamp\_Summary.md and Track\_2\_Prompts\_and\_Prompting\_Techniques.docx  
* Identified that the original Prompt 1 shared in the bootcamp document was incomplete — the actual phased prompt was recovered directly from participant notes and confirmed as a must-have structural element  
* Drafted the build prompt through multiple iterations with double-checks at each stage

**Issues found and resolved across drafts:**

* Missing knowledge capture loop (Technique 9\) — added Learning Command to Otto rules  
* Incorrect Google Trends API endpoint — replaced with pytrends library instruction after confirming Google Trends has no official public API  
* Duplicate negative constraint — removed  
* Short form revenue formula incorrectly scoped — clarified to apply only in comparative visualization, not primary pipeline  
* Title sentiment missing from Content Intelligence insights — added  
* Niche Classification column missing from RPM table — added  
* High-Value Niche categories not explicitly stated as a hardcoded business constant — added  
* Evergreen threshold derivation rule missing from Otto rules — added  
* Daily schedule automation removed from build prompt — kept as separate follow-up prompt per Technique 13 (conciseness for simple tasks)  
* Post-build verification questions removed from build prompt — kept as separate personal checklist per bootcamp Step 3 workflow  
* KAGGLE\_API\_TOKEN credential reference updated after discovering Kaggle's new single bearer token format replacing the old kaggle.json username/key pair

**Techniques incorporated:** All 18 bootcamp prompting techniques including plan-before-building, hardcoded exact values, anti-hallucination guardrails, iterative build-and-test, negative constraints, assumption-surfacing, bounded result requests, audience-aware prompting, comparison framing, scope definition, goal-concern-action structure, closed-loop verification, conciseness for simple tasks, quantified thresholds, explicit non-modification instructions, detailed output field specification, progressive verification depth, and boolean filter conditions.

**Output:** Final build prompt produced as a downloadable .md file after confirming table formatting was lost when pasting directly into Otto's chat interface.

---

## **Phase 3 — API Setup**

**Goal:** Connect three data sources — Kaggle API, YouTube Data API, and Google Trends.

**Kaggle API:**

* Discovered Kaggle recently changed their token system from kaggle.json with separate username/key to a single bearer token with KGAT\_ prefix  
* Created token named "Kaggle API for Otto" — original token accidentally shared in a screenshot and immediately revoked and replaced  
* Stored as KAGGLE\_API\_TOKEN in Ascend Default vault  
* Build prompt and Otto rules updated to reflect single credential pattern

**YouTube Data API:**

* Created Google Cloud project, enabled YouTube Data API v3, generated API key  
* Stored as YOUTUBE\_API\_KEY in Ascend Default vault

**Google Trends (pytrends):**

* No credentials required — pytrends wraps Google's unofficial endpoint anonymously  
* No setup action needed

**Secret injection issue:**

* Initial standard environment variable injection failed — secrets stored in Ascend vault were not reaching Python component runtime  
* Worked with Ascend Plan AI to identify correct pattern  
* Resolution: context.vaults.get("environment") rather than standard environment variable injection  
* Required updating component YAML with vault reference pattern: ${vaults.environment.SECRET\_NAME}  
  ---

  ## **Phase 3b — Plan Review and Decision Resolution**

**Goal:** Review Otto's proposed plan and resolve 10 flagged implementation decisions before any code was written — following Step 2 of the Track 2 workflow.

**Otto's plan confirmed:**

* Phased build sequence with live API inspection before any parsing  
* Validation gates before downstream components  
* Mandatory approval pause before viral fingerprint classification  
* All Otto rules and learning command included

**10 flagged decisions resolved:**

1. Flow name: youtube\_trending\_intelligence — approved  
2. Incremental state storage: two persistent tables (pipeline\_state for Kaggle watermark, youtube\_quota\_retry\_queue for failed YouTube enrichment retries)  
3. YouTube category ID mapping: hardcoded lookup dictionary — flag unknown IDs rather than dropping  
4. Topic clustering: TF-IDF \+ K-Means with 25 clusters — report silhouette score before proceeding; BERTopic noted as future enhancement  
5. Title sentiment: VADER with compound score thresholds (positive ≥ 0.05, negative ≤ \-0.05)  
6. Timezone strategy: pytz with hardcoded country-to-timezone mapping — most populous timezone for multi-timezone countries, default UTC with warning  
7. Last successful run date: maximum snapshot\_date in already-ingested data; first run pulls all rows  
8. YouTube quota tracking: daily granularity resetting at midnight Pacific Time, stop at 9,500 units, batch up to 50 video IDs per call  
9. Dashboard structure: two separate artifacts — primary Monetization Intelligence Dashboard and Short Form vs. Long Form Comparative Panel  
10. Failure alert: pass component name, error message, and stack trace to Otto for plain-language root cause diagnosis and proposed fix in email body

**Additional resolution before build:**

* pytrends and vaderSentiment not installed in runtime — Otto flagged before proceeding, approved Option A (add as project-managed dependencies in ascend\_project.yaml)  
  ---

  ## **Phase 4 — Data Ingestion**

**Goal:** Ingest the 6.82GB Kaggle dataset into the Ascend pipeline.

This phase encountered the most obstacles by far.

**Attempt 1 — Kaggle API via Python read component**

* Auth worked after switching from Kaggle CLI (which doesn't support new bearer token format) to direct HTTP bearer token authentication  
* Component repeatedly OOM-killed (exit code 137\) despite:  
  * Reducing chunk sizes from 10,000 to 5,000 to 2,000 rows  
  * Applying column selection at read time (16 columns only)  
  * Using gc.collect() after each chunk  
  * Streaming ZIP via BytesIO without writing to disk  
  * Using zipfile.Path to avoid full decompression  
  * 1MB network chunking

**Attempt 2 — Two-step split (download \+ process as separate components)**

* Download component succeeded  
* context.tmp\_dir is component-scoped — ZIP file not accessible to downstream processing component  
* Cross-component file sharing via context.tmp\_dir confirmed not supported in Ascend

**Attempt 3 — Native Ascend connector**

* Confirmed via Plan AI: no native Kaggle connector exists in this workspace  
* Native file readers support: postgres, snowflake, bigquery, sftp, s3, abfs, mssql, http, local\_file, gcs, oracle, generic\_file, databricks, mysql, db2 — no DuckDB/Kaggle

**Attempt 4 — OneLake / Microsoft Fabric staging**

* data\_plane\_fabric.yaml connection exists but Plan AI could not confirm credentials are automatically available to Python components  
* Not pursued due to time constraints

**Attempt 5 — Local file upload via read\_local\_files**

* \#connection:read\_local\_files points at project's data/ directory  
* Ascend UI drag-and-drop has a 2MB limit  
* 6.82GB file cannot be uploaded this way  
* Plan AI confirmed putting 6.82GB in source-controlled data/ directory is not recommended regardless

**Attempt 6 — GCS upload via read\_gcs\_lake**

* Plan AI recommended uploading to gs://ascend-ottos-expeditions/lakev0/uploads/  
* Installed Google Cloud SDK on local Mac (M2 Pro):  
  * Downloaded ARM64 installer  
  * Ran bash \~/Downloads/google-cloud-sdk/install.sh  
  * Added Homebrew to PATH via .zprofile  
  * Authenticated via gcloud auth login  
* Write access test failed: 403 AccessDeniedException — personal Google account lacks storage.objects.create permission on Ascend's GCS bucket

**Solution — MotherDuck:** Following a suggestion from the Ascend Slack community:

* Created free MotherDuck account at app.motherduck.com  
* Installed Homebrew (required before DuckDB CLI could be installed):  
  * Ran /bin/bash \-c "$(curl \-fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"  
  * Added Homebrew to PATH via three .zprofile commands  
* Installed DuckDB CLI via brew install duckdb  
* Connected to MotherDuck: duckdb "md:?motherduck\_token=YOUR\_TOKEN"  
* Created database YouTube Trending Videos in MotherDuck UI  
* Loaded CSV using DuckDB CLI:  
  sql  
1.  USE "YouTube Trending Videos";  
2.   CREATE TABLE trending\_videos AS  
     SELECT \* FROM read\_csv\_auto('/Users/mayaospina/Downloads/trending\_yt\_videos\_113\_countries.csv');  
* Result: 5,013,692 rows loaded (99.9% of dataset — 5,543 row difference due to malformed rows skipped by read\_csv\_auto)  
* All 18 columns present with correct data types — notably publish\_date loaded as timestamp with time zone preserving timezone information for lag calculations  
* Added MOTHERDUCK\_API\_KEY to Ascend Secrets  
* Configured data\_plane\_motherduck as the flow's data plane

---

## **Phase 5 — MotherDuck Integration Challenges**

**Goal:** Read the MotherDuck table into the Ascend flow.

**Attempt 1 — Python read component with direct MotherDuck connection**

* duckdb.connect() with ATTACH 'md:...' failed — no token provided at runtime  
* context.get\_component(...).connection not available on Python reads

**Attempt 2 — Native YAML read component**

* Plan AI suggested connection: data\_plane\_motherduck with duckdb: tag  
* Failed with TypeError: isinstance() arg 2 must be a type, a tuple of types, or a union  
* Confirmed: duckdb/motherduck is not in the supported YAML read component tag list

**Solution:** Plan AI confirmed that a SQL component executed on the MotherDuck data plane is the correct supported pattern — not a YAML read component. Switched to .sql source component querying "YouTube Trending Videos".trending\_videos directly. Validated successfully with 5,013,692 rows.

---

## **Phase 6 — YouTube API Enrichment Challenges**

**Goal:** Enrich video IDs with duration, category, and subscriber count from YouTube Data API.

**Attempt 1 — Python @read component accessing upstream data**

* Failed with TypeError: missing positional argument: 'context'  
* Failed with AttributeError: 'SimpleComponentStore' object has no attribute 'to\_pandas'  
* Plan AI confirmed: @read components cannot consume upstream datasets — that pattern is reserved for @transform only

**Attempt 2 — Pandas merge in @transform**

* Join against 5,013,692 row upstream dataset effectively stalled — pandas loaded entire dataset into pod memory

**Solution:** Restructured into two components:

1. @read component (read\_youtube\_video\_enrichment.py) — fetches YouTube API data externally only, no upstream component access  
2. @transform component (transform\_youtube\_enrichment.py) — uses Ibis (not pandas) to push join computation into MotherDuck data plane rather than Python pod — completed in 74 seconds

**Known limitation flagged for production readiness:** YouTube enrichment currently validates against a single hardcoded video ID. Full quota-aware incremental enrichment using youtube\_quota\_retry\_queue table to be implemented in production readiness phase.

---

## **Phase 7 — Remaining Phase 9 Insight Families and Threshold Review**

**Goal:** Complete missing insight output families and derive data-driven viral fingerprint thresholds.

**Viral fingerprint threshold review — mandatory gate:** Otto correctly paused before applying classifications. MotherDuck connection instability prevented Otto from extracting distributions directly — the same DuckDB internal error (INTERNAL Error: Attempted to dereference unique\_ptr that is NULL\!) that later caused dashboard crashes. Worked around by querying directly from DuckDB CLI on local machine:

| Metric | p50 | p75 | p90 | Max |
| ----- | ----- | ----- | ----- | ----- |
| daily\_movement | \-1.0 | 12.0 | 33.0 | 49 |
| weekly\_movement | 20.0 | 35.0 | 44.0 | 49 |
| Trending tenure (days) | 2.0 | 5.0 | 9.0 | 37 |

**Key observation:** Weekly movement median of \+20 revealed that videos surviving a full week are actually climbing — a stronger sustained momentum signal than originally assumed. Evergreen threshold dropped from provisional 14 days to data-derived 9 days.

**Data-derived thresholds approved:**

* Rocket: daily\_movement ≥ 33  
* Slow Burner: weekly\_movement ≥ 35 AND tenure ≥ 5 days  
* Evergreen: tenure ≥ 9 consecutive days  
* Flash: daily\_movement ≥ 33 on entry AND daily\_movement ≤ \-20 within 3 days

**Insight families built and validated:**

| Component | Records | Notes |
| ----- | ----- | ----- |
| topic\_cluster\_lifecycle\_analysis.sql | 600 | Top 10 rising and declining clusters per month |
| premium\_quadrant\_category\_rankings.sql | 31 | Top 10 categories by Premium share per month |
| niche\_gem\_category\_rankings.sql | 31 | Top 10 categories by Niche Gem share per month |
| country\_volatility\_language\_diversity\_trends.sql | 835 | Top 10 most volatile, stable, fastest diversity-growth countries |

---

## **Phase 8 — Alerting, Otto Rules, and Production Readiness**

**Goal:** Implement failure alerting, topic spike alerting, all Otto rules, and production readiness pass.

**Alerting:**

* youtube\_trending\_intelligence\_failure\_alert.yaml — triggers on FlowRunFailure, includes root cause analysis and proposed fix  
* youtube\_trending\_topic\_spike\_alert.yaml — initially referenced general summary outputs rather than topic cluster data; discovered during pre-production status review and updated after topic cluster component was validated to reference topic\_cluster\_lifecycle\_analysis

**Otto rules and commands created:**

* monetization\_strategy.md — keyword-scoped  
* data\_quality\_youtube.md — glob-scoped  
* api\_quota\_management.md — keyword-scoped  
* incremental\_ingestion.md — always-on  
* threshold\_derivation.md — always-on  
* learning.md (rule) and learning.md (command) — both created

**Pre-production status review findings:** Before proceeding to production readiness, a full status check revealed:

Phase 9 fully validated families (6):

* Timing intelligence summary  
* Monetization intelligence summary  
* Viral fingerprint intelligence summary  
* Content intelligence summary  
* Time-series trend intelligence summary  
* Short form vs long form comparative panel

Phase 9 still pending:

* Hashtag density analysis  
* Title sentiment correlation  
* Seasonality analysis  
* Several named ranking output families

**Production readiness:**

* All components reviewed for hardcoded dates and static time windows  
* Incremental watermark for MotherDuck ingestion remains a known deferred item — to be implemented post-hackathon  
* Full end-to-end pipeline run not yet confirmed due to dashboard issues taking priority

---

## **Phase 9 — Dashboard Build and Rebuild**

**Goal:** Build two presentation-ready dashboards.

### **Dashboard Architecture Problem — DuckDB Arrow Conversion Bug**

**Problem:** Both dashboard applications crashed the workspace with: INTERNAL Error: Attempted to dereference unique\_ptr that is NULL\!

**Root cause:** Diagnosed by Plan AI as a DuckDB internal Arrow conversion bug triggered when dashboard applications queried data\_plane\_motherduck directly via window.ascend.runQuery().

**Solution:** Switched both dashboards from direct MotherDuck queries to pre-materialized Ascend dataset queries:

Dashboard 1 materialized views:

* dashboard1\_monetization\_kpis.sql (1 record)  
* dashboard1\_platform\_health\_trend.sql (31 records)  
* dashboard1\_top\_categories.sql (124 records)  
* dashboard1\_viral\_fingerprint\_profile.sql (496 records)

Dashboard 2 materialized views:

* dashboard2\_panel\_metrics.sql (31 records)  
* dashboard2\_revenue\_trend.sql (31 records)  
* dashboard2\_premium\_share\_trend.sql (31 records)

---

### **Dashboard v1 Assessment**

Both dashboards rendered but were assessed as largely unusable due to:

* All category data showing as Uncategorized — YouTube API enrichment gap  
* Charts too small and cramped  
* Non-functional Refresh buttons  
* Short form data entirely missing — no videos classified as short form due to YouTube API duration enrichment gap

---

### **Dashboard Rebuild Decisions**

**Key decisions:**

* Scrolling layout preferred over tabs  
* New files created rather than overwriting existing ones  
* Refresh button removed — non-functional and misleading  
* Data gaps handled with explicit "Insufficient data" messages  
* Minimum chart height 300px enforced  
* One prompt per dashboard for iterative build and test  
* Prompts double-checked against v2 summary before sending  
* Placeholder instructions added for missing insight families

**Dashboard 1 first rebuild attempt failure:** Otto reported success but file on disk still contained only original four sections. Discovered by asking Otto to list section headers. Solution: instruct Otto to create a brand new file at a new path.

**Dashboard file paths:**

* Dashboard 1 v2: applications/youtube-monetization-intelligence-dashboard-v2/youtube-monetization-intelligence-dashboard-v2.tsx  
* Dashboard 2 v2: applications/youtube-short-vs-long-panel-v2/youtube-short-vs-long-panel-v2.tsx — Prompt B drafted but not yet sent

---

### **Dashboard 1 v2 Assessment**

**Overall:** Significantly better than v1. Dark theme professional, scrolling layout working, sections properly sized. Eight sections present. Several issues remain.

| Section | Status | Issues |
| ----- | ----- | ----- |
| Section 1 — Executive KPI Snapshot | ✅ | Clean, readable, realistic numbers |
| Section 2 — Platform Health and Revenue Trajectory | ⚠️ | Y-axis starts at 0; revenue trajectory line missing |
| Section 3 — Monetization Category Leadership | ❌ | All Uncategorized; bar chart labels missing; enrichment gap note not rendered |
| Section 4 — Timing and Speed-to-Trending Intelligence | ❌ | Scatter plot unlabeled; only 10 data points; Uncategorized bar useless; trend line empty |
| Section 5 — Viral Fingerprint Performance Mix | ✅ | Best section — correct labels, credible revenue data. "Avg videos: 0.0" is a data aggregation issue |
| Section 6 — Topic Lifecycle and Category Opportunity Rankings | ⚠️ | Rising topics interesting but momentum percentages in millions indicate calculation error; Premium/Niche Gem Uncategorized |
| Section 7 — International Diversity, Concentration, Entry Conditions | ❌ | Concentration score good; Barrier to entry empty; country diversity all zeros |
| Section 8 — Benchmark and Threshold Evolution | ❌ | All zeros; empty chart; entire section has no data |

**Fix priority:**

Must fix:

* Section 3: replace Uncategorized charts with placeholder cards; add enrichment gap note  
* Section 4: add axis labels; fix trend line; replace Uncategorized bar with placeholder  
* Section 6: fix revenue momentum percentage calculation  
* Section 7: fix country diversity zeros; fix Barrier to Entry empty chart  
* Section 8: identify missing data source; fix all zero KPIs

Should fix:

* Section 2: zoom Y-axis to 30-37 range; add revenue trajectory line  
* Section 4: increase scatter plot granularity  
* Section 5: fix "Avg videos: 0.0" aggregation issue

Accept as known limitation:

* All Uncategorized category data — post-hackathon fix  
* Short form data missing — same root cause

---

## **Dashboard 2 Status**

Prompt B drafted and double-checked but not yet sent. **Dashboard 2 fixes will happen post-hackathon.** Dashboard 1 v2 is the primary presentation deliverable.

---

## **Phase 10 — Dashboard 1 v3 Section-by-Section Fixes**

**Goal:** Fix Dashboard 1 section by section using targeted prompts, verifying each fix via screenshot before proceeding to the next.

**Ground rules established:**

* Fix directly in main dashboard file only — never create separate preview files  
* Never remove or modify other sections when fixing one  
* Verify via screenshot after each fix  
* Preview one section at a time to avoid MotherDuck connection crashes  
* Use browser inspect mode to give Otto exact rendered code when visual layout fixes fail

---

### **Section 2 — Platform Health and Revenue Trajectory**

**Fixes applied:**

* Zoomed Y-axis from default (0) to actual data range (28-40) making trend variation clearly visible  
* Added overall average dashed reference line at 33.92  
* Attempted to add revenue trajectory line as second line — broke the chart entirely when second Y-axis was added, all values showing 0.00  
* First revert attempt failed — chart still broken and showing 0.00  
* Second revert required — Otto investigated exact column names being referenced before restoring, confirmed correct column as avg\_monthly\_platform\_health\_index  
* Revenue line abandoned entirely to preserve working chart  
* Updated subtitle to two-tier approach:  
  * Plain language: "Monthly composite score measuring overall content performance health across engagement quality, format distribution, viral momentum, and geographic reach."  
  * Detail line: "Inputs: engagement quality · premium & niche gem share · viral fingerprint distribution · long form share · trend momentum · country spread · data quality"  
* Replaced "Monthly coverage points" KPI card with "Month-over-month change" KPI card showing health score direction vs previous month with color coding (green for positive, red for negative)  
* "Latest platform health" KPI card subtitle still showing internal component reference \#component:dashboard1\_platform\_health\_trend — noted as issue, accepted as is for now

**Key discovery — Platform Health Index naming conflict:** The Platform Health Index shown in Section 2 is Otto's own composite score combining engagement quality, premium/niche gem share, viral fingerprint distribution, long form share, trend momentum, country spread, and data quality — not the four structural metrics (Volatility, Concentration, Barrier to Entry, Diversity) we originally specified. Those live in Section 7\.

Agreed naming resolution:

* Section 2 composite score should eventually be renamed "Content Performance Health Score"  
* Section 7 metrics retain the "Platform Health Index" name  
* Naming change agreed but not yet implemented as a fix prompt

**Status:** ✅ Approved

---

### **Section 3 — Monetization Category Leadership**

**Fixes applied:**

* Added enrichment message box outside and above charts explaining YouTube API quota limitation  
* Fixed bar chart Y-axis labels — root cause was null youtube\_category\_name values; resolved by adding .map() fallback youtube\_category\_name || 'Uncategorized' before passing data to chart  
* Fixed bar chart sizing using browser inspect mode — Otto located exact code and fixed immediately

**Current active fix — prompt drafted and ready to send:**

* Update subtitle to: "Which YouTube categories generate the most revenue? Rankings will become more precise as category data is enriched."  
* Add 2×2 matrix legend card as sibling element outside all chart containers, between subtitle and enrichment message box, explaining Premium, Passive, Niche Gem, Skip quadrant terms:  
  * Top right (High Reach, High Engagement): Premium — High views, high engagement. Strongest monetization signal.  
  * Top left (High Reach, Low Engagement): Passive — High views, low engagement. Reach without depth.  
  * Bottom right (Low Reach, High Engagement): Niche Gem — Lower views, high engagement. Underserved audiences with strong monetization potential.  
  * Bottom left (Low Reach, Low Engagement): Skip — Low views, low engagement. Lowest priority.  
  * No colors or emojis — content speaks for itself  
* Placement order: subtitle → matrix card → enrichment message box → charts and table

**Key lesson:** When Otto can't find a visual layout issue from code alone, providing a browser inspect screenshot with highlighted elements resolves it immediately.

**Status:** 🔄 Current active section — prompt ready to send

---

### **Section 4 — Timing and Speed-to-Trending Intelligence**

**Fixes applied:**

* Added axis labels to scatter plot: X \= "Hour of day (UTC)", Y \= "Avg engagement score"  
* Added coverage note: "only 10 of 24 hours have sufficient data"  
* Fixed Uncategorized bar chart with null fallback label  
* Added enrichment note above right bar chart  
* Moved both notes below KPI cards and above their respective charts — matching Section 3 info box styling  
* Fixed publish-to-trending trend line — root cause was column name mismatch (barrier\_to\_entry\_score vs avg\_publish\_to\_trending\_lag\_hours)  
* Converted publish-to-trending from LineChart to AreaChart matching Section 2 styling — primary blue \#0ea5e9, semi-transparent fill fillOpacity={0.2}, overall average reference line, zoomed Y-axis  
* Changed amber warning note styling to match Section 3 info box  
* Changed X-axis ticks to \[6, 12, 18, 24\] with interval={0} to force all ticks to render  
* Added margin={{ top: 10, right: 30, bottom: 50, left: 60 }} to ScatterChart for better spacing  
* Changed ResponsiveContainer from width="96%" to width="100%" — discovered that 96% width was causing centering issues because container already had p-4 padding handling spacing

**Scatter plot dot below X-axis — extensive troubleshooting:** Multiple fix attempts all failed:

* ZAxis range reduction from \[80, 500\] to \[40, 200\]  
* Domain changes on XAxis  
* Data filtering with .filter(d \=\> d.avg\_engagement\_quality\_score \> 0\) and .filter(row \=\> row.publish\_hour \> 0\)  
* Margin adjustments  
* Confirmed all 10 scatter rows have positive avg\_engagement\_quality\_score values and publish\_hour values from 1-20 — dot is a ZAxis bubble overflow rendering artifact not a data issue  
* Accepted as known issue — ZAxis controls bubble size using snapshot\_count, causing large bubbles to overflow chart boundary

**Tailwind CSS learning:** max-w-3xl is a Tailwind utility class mapping to max-width: 48rem (768px). Confirmed via Tailwind documentation, browser inspect computed styles, or VS Code IntelliSense hover. ResponsiveContainer percentage-based sizing is preferred over fixed pixel values for responsive layouts — container padding should handle spacing rather than percentage width reductions.

**Engagement quality score multiplier issue:** Otto implemented engagement quality score with multiplier of 2 instead of specified 5 — affects all downstream metrics using engagement\_quality\_score including Section 4 scatter plot Y-axis, benchmark outputs, timing summaries, and monetization summaries. Accepted as is for hackathon — reframed as conservative design decision. To be corrected post-hackathon.

**Ongoing issues accepted for now:**

* Scatter plot blue dot below X-axis — ZAxis bubble overflow artifact  
* Scatter plot not perfectly centered in container  
* Right bar chart still pink (\#ec4899) — to be fixed manually using browser inspect  
* Tick at hour 18 sometimes missing despite interval={0}

**Status:** ⚠️ Partially approved — pink bar chart to be fixed manually post-hackathon

---

### **Section 5 — Viral Fingerprint Performance Mix**

**Context:** The original subtitle "Uses the exact validated fingerprint labels in the pipeline output: evergreen, flash, none, rocket, and slow\_burner" was identified as pure technical jargon meaningless to a new user. Discussion led to separating what the section does (subtitle) from what the classifications mean (legend).

**Fixes applied:**

* Updated subtitle to: "Which content momentum pattern generates the most revenue?"  
* Added legend container box between subtitle and chart showing four classifications with plain language descriptions. Flash color confirmed as \#ec4899 (pink) not orange — corrected from earlier assumption:  
  * Evergreen \#22c55e — Stays trending 9+ days  
  * Rocket \#8b5cf6 — Rapid single-day rank spike  
  * Slow Burner \#0ea5e9 — Sustained weekly climb  
  * Flash \#ec4899 — Fast rise, fast fall

**Status:** ✅ Approved

---

### **Section 6 — Topic Lifecycle and Category Opportunity Rankings**

**Key discovery — Revenue momentum formatting error:** Revenue momentum values appearing as millions of percent (e.g. 15,456,079.3%) were not a calculation error — they were a formatting error. The underlying topic\_revenue\_momentum field is an absolute month-over-month currency delta calculated as:

current\_month\_avg(recency\_weighted\_estimated\_revenue) \- prior\_month\_avg(recency\_weighted\_estimated\_revenue)

The app was incorrectly using formatPercent(value, 1\) which multiplied the value by 100 and added a % sign. Delta period \= one month (LAG function ordered by snapshot\_month).

**Fixes applied:**

* Fixed Revenue momentum column formatting in both rising and declining topics tables — changed from formatPercent(value, 1\) to formatCurrency(value)  
* Renamed column to "Revenue momentum (Δ monthly avg)" in both tables to clarify it is an absolute monthly change not a percentage  
* Added single enrichment message box as sibling element above all three tables (rising topics, Premium, Niche Gem):  
  * Header: "Category Enrichment In Progress"  
  * Body: "Topic clusters and category rankings will become more precise as YouTube Data API enrichment completes. Currently showing default Uncategorized classification for category fields. Current enrichment progress: 1 of 5,013,692 videos enriched."

**Status:** ✅ Approved

---

### **Section 7 — International Diversity, Concentration, and Entry Conditions**

**Fixes applied:**

**Field name mismatch fixes (data now showing correctly):**

* Barrier to Entry chart: changed data key from barrier\_to\_entry\_score to median\_view\_count\_for\_top\_10  
* Country diversity table field name fixes:  
  * country\_name → country\_code  
  * language\_diversity\_growth\_rate → language\_diversity\_growth  
  * Removed country\_revenue\_growth\_rate — field doesn't exist in data  
  * Removed country\_volatility\_score — field doesn't exist in data  
  * Added language\_diversity\_score as new column labeled "Diversity score"

**Volatility Score:**

* Confirmed Volatility Score had not been built — created new SQL component dashboard1\_volatility\_score\_trend calculating AVG(ABS(daily\_movement)) per month  
* Added Volatility Score as second line on Concentration Score chart with dual Y-axis and legend  
* Updated chart title to "Market Concentration and Volatility"  
* Updated chart subtitle to "Tracks whether trending is becoming more dominated and unpredictable over time"

**Key data insights discovered:**

* Concentration Score declining from 0.36 to 0.27 — trending becoming less dominated by top channels over time  
* Volatility Score spiking in early 2026 — trending list becoming more unpredictable recently  
* Together: trending is becoming less concentrated but more volatile — harder to predict but more open to new creators  
* Country table showing Malta, Switzerland, Liechtenstein, Ghana, Hong Kong, Singapore — correct data, not an error. Small multilingual countries show fastest diversity growth naturally. USA trending list is homogeneous English content so diversity score doesn't grow much  
* Dramatic cliff drop in Barrier to Entry around 2025-07 (from \~2,800,000 to \~600,000 views) — potentially significant signal that trending is becoming more accessible, or could reflect recency weighting depressing recent values

**Pending fixes:**

* Zoom both Y-axes to actual data ranges  
* Fix uneven X-axis month spacing on both charts  
* Update section subtitle to: "Tracks whether trending is becoming more concentrated, more volatile, and harder to enter — and whether monetization is broadening across countries and languages or narrowing to established players."  
* Add Y-axis labels to both charts:  
  * Concentration/Volatility chart: left axis "Concentration score", right axis "Volatility score". Change Y-axis decimal values to percentages (0.27 → 27%)  
  * Barrier to Entry chart: Y-axis "Views needed for top 10", format as abbreviated values (1.4M, 2.8M)  
* Fix country table to show top 10 countries instead of current 6 — likely a LIMIT or slice in app layer  
* Convert Concentration Score chart to match Section 2 AreaChart styling  
* Change Barrier to Entry line color from pink (\#ec4899) to primary blue (\#0ea5e9) for color consistency — pink is designated as Flash color in fingerprint section

**Expanded metric explanations documented for presentation:**

*Concentration Score:* Percentage of all trending slots captured by top 100 channels each month. Rising \= trending dominated by established players, harder for new creators. Declining \= algorithm surfacing more diverse content, better opportunity.

*Barrier to Entry:* Median view count required to reach daily rank 10 or above across all 113 countries each month. One of the four original Platform Health Index components. The dramatic drop from \~2.8M to \~600K in 2025-2026 is the most actionable insight for a creator — suggests now is a better time to trend than 2024\.

*Volatility Score:* Average absolute daily rank change across all videos per month. Rising \= trending list becoming more unpredictable. Falling \= more stable and predictable trending environment.

*Diversity Score:* Number of unique languages in top 50 trending videos per country per month. Rising \= market opening to international content. Falling \= market becoming more linguistically homogeneous.

**Status:** 🔄 Partially fixed — multiple pending fixes outlined above

---

## **Section 8 — Benchmark and Threshold Evolution**

### **Initial state:** All four KPI cards showing zeros and benchmark evolution chart completely empty. Root cause was missing data source connection.

### **Investigation findings:** Otto confirmed the cliff drop in Average views after 2025-06 was caused by none of the usual suspects:

* ### Not a row count drop — monthly rows remained stable at \~165,000-175,000

* ### Not short form mixing — benchmark confirmed long form only with short\_form\_rows \= 0 every month

* ### Not recency weighting — Section 8 uses raw AVG(COALESCE(view\_count, 0)) not weighted values

* ### Not null or zero view counts — only minimal zeros found, not enough to explain the cliff

* ### **Real cause:** underlying long form view\_count values genuinely lower from 2025-08 onwards — newer videos captured closer to publish date before accumulating full lifetime view counts. Dataset construction artifact, not a real platform decline.

### **Fixes applied:**

* ### KPI cards now showing real data:

  * ### Average views: 2,794,727 ✅

  * ### Average likes: 130,864 ✅

  * ### Engagement quality: 0.0469 ✅

  * ### Tracked months: 31 ✅

* ### Removed Average likes line from chart — reason: Average likes and Average views were on vastly different scales sharing the same right Y-axis making Average likes nearly invisible as a flat pink line near zero. Third Y-axis considered but rejected — Recharts only natively supports two Y-axes and a third would require complex custom code and look cluttered. Average likes KPI card retained as standalone benchmark figure

* ### Changed Average views line color from orange (\#f59e0b) to teal (\#14b8a6) — orange was creating color inconsistency since teal is the established secondary color used for data lines throughout the dashboard

* ### Fixed tooltip formatting — raw floating point values replaced with formatted numbers

* ### Formatted Y-axis values as abbreviated (16M, 4M etc.)

* ### Updated subtitle to reflect the two specific metrics shown

* ### Note initially placed incorrectly above KPI cards — moved to asterisk footnote below chart following standard data visualization convention

* ### Added asterisk footnote below chart combining both explanations:     \*Note: recency weighting (2025-2026: 1.0x, 2024: 0.6x, 2023: 0.3x) would typically push recent averages higher. The post-2025 decline in average views instead reflects a dataset construction characteristic — newer videos were captured closer to their publish date before accumulating full lifetime view counts, not a real platform decline.  

### **Accepted as known limitations:**

* ### Cliff drop after 2025-06 — explained by asterisk note

* ### Engagement quality multiplier (2 instead of 5\) — post-hackathon fix

* ### "Tracked months: 31" KPI card — not analytically meaningful but accepted due to time constraints

### **Status:** ✅ Approved

### ---

## **Carry-Forward Items**

**Production readiness — YouTube enrichment:** Once all dashboard fixes are complete, implement quota-aware incremental YouTube enrichment to run daily — processing a batch of unenriched video IDs up to 9,500 unit quota limit per run, prioritising 2025-2026 videos first, logging processed IDs to youtube\_quota\_retry\_queue table.

**Dashboard 2:** Prompt B drafted and double-checked but not yet sent. Dashboard 2 fixes confirmed as post-hackathon work.

**Post-hackathon fixes:**

* Engagement quality score multiplier correction (2 → 5\)  
* Section 4 pink bar chart color fix  
* Section 4 scatter plot dot below X-axis  
* Section 7 full styling pass  
* Section 8 investigation and fix  
* Dashboard 2 full build  
* Subsequent prompts (Prompts 2-7) for post-build verification workflow  
* Full end-to-end pipeline run confirmation  
* Platform Health Index naming — Section 2 composite to be renamed "Content Performance Health Score"

---

## **Key Lessons Learned**

1. **Validate data ingestion feasibility before committing to a dataset** — file size, authentication mechanism, platform memory constraints, and native connector availability should all be checked upfront  
2. **Platform-specific limitations are invisible until you hit them** — Plan AI is an essential tool for resolving them without wasting build cycles and tokens  
3. **Cloud database solutions bypass file handling entirely** — MotherDuck (or similar) is far better suited to large analytical datasets than file-based ingestion in memory-constrained environments  
4. **The Ascend component model has strict boundaries** — @read is for external ingestion only, @transform is for processing upstream data, SQL components are for data plane queries  
5. **Ibis outperforms pandas for large dataset operations** — by pushing computation into the data plane rather than the Python pod  
6. **Always test write permissions before planning an upload strategy** — the GCS permission issue could have been caught with a 1KB test file before any SDK installation  
7. **Community resources matter** — the MotherDuck solution came from the Ascend Slack community, not from documentation or AI assistance  
8. **Dashboard applications must use pre-materialized datasets** — direct MotherDuck queries trigger DuckDB Arrow conversion bug. Same error appeared during threshold distribution extraction  
9. **A single unenriched data source cascades into multiple downstream gaps** — single-record YouTube enrichment affected category labeling, revenue accuracy, short form classification, and multiple dashboard sections  
10. **Scrolling layouts outperform tabs for hackathon presentations**  
11. **Data gaps should be acknowledged explicitly in the UI** — placeholder cards more credible than $0 or Uncategorized  
12. **Always validate file creation visually in the UI** — Otto reported files created that weren't visible until browser refresh  
13. **Revenue momentum percentages require careful base value handling** — division by near-zero early-month values produces misleading results  
14. **A single unenriched record validating correctly does not mean production-ready** — YouTube enrichment passed all tests against one video but produced no usable data at scale  
15. **Pre-hackathon checklist for data ingestion:** file size, authentication mechanism, platform memory constraints, native connector availability, cloud database alternative, write permissions for staging storage  
16. **Never ask Otto to clean up or simplify the main dashboard file** — always scope cleanup to temporary or test files only; git history is your safety net for recovery  
17. **Browser inspect mode is the most reliable debugging tool for visual layout issues** — provide Otto with highlighted inspect screenshots when layout fixes fail repeatedly  
18. **Formatting errors can masquerade as calculation errors** — always verify the root cause before attempting SQL fixes  
19. **Field name mismatches are the most common cause of empty charts and zero values** — always ask Otto to inspect actual returned column names before attempting data fixes  
20. **ZAxis in Recharts controls bubble size** — large snapshot\_count values can cause bubbles to overflow chart boundaries; reduce ZAxis range or remove entirely if bubble size encoding adds no analytical value  
21. **Tailwind utility classes map to specific CSS values** — max-w-3xl \= 48rem, verified via documentation, browser inspect computed styles, or VS Code IntelliSense. ResponsiveContainer percentage widths should be 100% when container padding already handles spacing  
22. **Percentage-based sizing with existing padding creates double-spacing** — width="96%" alongside p-4 padding causes unequal spacing; always use width="100%" and let padding handle the margins  
23. **Two different things were named Platform Health Index** — Otto's Section 2 composite score and the four structural Section 7 metrics. Always verify what a metric actually calculates before designing visualizations around it

24. ### **Asterisk footnotes below charts are more professional than info boxes for data caveats** — user-driven design decision that proved correct. Standard convention in academic papers, financial reports, and dashboards. Less intrusive and more credible to technically literate judges.

25. ### **Dataset construction artifacts can masquerade as platform trends** — always investigate unexpected cliff drops or spikes before assuming they reflect real-world behavior. Newer videos having fewer accumulated views than older ones created a false impression of platform decline.

26. ### **Combining apparent contradictions in footnotes demonstrates data literacy** — explaining why recency weighting should push values up but dataset construction pulls them down shows judges you understand your data deeply enough to spot and explain contradictions.

27. ### **Investigate all five root causes before concluding a data issue is real:** row count changes, format mixing, weighting effects, null values, zero values — systematic elimination of each candidate is the correct debugging approach.

28. ### **A third Y-axis in Recharts requires complex custom code** — when three metrics on vastly different scales need to be shown together, removing the least critical metric and keeping it as a KPI card is cleaner than forcing a third axis.

  


  


**Next Phase:**

* Hashtag density analysis  
* Seasonality analysis  
* Title sentiment correlation  
* Full YouTube API enrichment (quota-aware incremental)  
* Automated Kaggle ingestion once memory constraints are resolved

**The direct connection to monetization:**

The Platform Health Index was designed as a **market conditions indicator** for a content creator optimizing for revenue. Specifically:

* **Volatility Score** — tells a creator how stable the trending list is. High volatility means trending is more unpredictable, which affects how reliably a creator can plan a posting strategy around trending windows  
* **Concentration Score** — tells a creator how dominated the trending list is by established channels. A rising Concentration Score means fewer channels control trending slots, making it harder for new creators to break in — directly relevant to monetization opportunity  
* **Barrier to Entry** — tells a creator how many views are needed to reach the top 10\. A rising Barrier to Entry means the revenue threshold is getting harder to achieve  
* **Diversity Score** — tells a creator which markets are opening up to international content, identifying new monetization opportunities in emerging markets

**The honest critique:**

However looking at Section 2 as it actually appears in the dashboard, it's showing only the **overall platform health score** as a single composite number — not the four individual metrics that make it meaningful. A line trending from 35 to 31 over 2.5 years tells a judge very little without explaining what that number represents and why it matters for revenue.

The section would be significantly more valuable if it showed the four metrics separately so a creator could see specifically whether the barrier to entry is rising, whether concentration is increasing, and which markets are becoming more diverse — rather than a single abstract composite score.

**My recommendation:**

For the presentation, frame Platform Health as "the market intelligence layer" — it tells an autonomous posting agent whether conditions are becoming more or less favorable for monetization before it decides what to post and where. That framing connects it directly to your stated goal of building a future autonomous agent, which is a compelling narrative for judges.

**The YouTube Data API quota limit**

The YouTube Data API gives you 10,000 quota units per day. Each API call that retrieves video details costs 1 unit and can fetch up to 50 videos at a time. That means you can enrich a maximum of 500,000 video records per day (10,000 units × 50 videos per call).

However our dataset has 5,013,692 rows — but more importantly it has a large number of **unique video IDs** that each need to be enriched once to get their category, duration, and subscriber count.

**Why only one video was enriched**

When Otto built the YouTube enrichment component, it validated it against a single hardcoded video ID as a test record. We approved this at the time because:

* The component was validated as working correctly  
* Full enrichment was explicitly deferred to the production readiness phase  
* We noted it as a known limitation to address post-hackathon

So the enrichment component works correctly — it just hasn't been run at scale yet.

**Why it has to be incremental**

Even if we ran the enrichment today at full quota, 10,000 units ÷ 1 unit per call × 50 videos \= 500,000 videos per day maximum. With potentially millions of unique video IDs in the dataset, full enrichment would take multiple days of consecutive pipeline runs.

**The cascading impact**

Because category comes from the YouTube API enrichment, and almost no videos have been enriched yet, virtually every video defaults to "Uncategorized" with the $3.50 default RPM. This affects every downstream calculation that depends on category — revenue estimates, monetization quadrant rankings, Premium and Niche Gem category rankings, and the bar chart labels.

This is why the uncategorized issue appears everywhere simultaneously — it all flows from the same single unenriched source.

---

## Post-Hackathon Revival Update — 2026-07-01

After the hackathon, Ascend.io shut down. The dashboard was revived to run independently: the computed data was exported from MotherDuck into static JSON snapshots, the dashboard was rebuilt as a standalone React app (`dashboard-live/`), and it was deployed to Netlify as a static site. (See the repo `README.md` and `dashboard-live/README.md`.)

As part of that, every "pending fix" and "carry-forward" item above was re-checked against the actual `v3` dashboard code and its rendered output. Status reconciliation:

### Already resolved in v3 — no longer pending

Verified against the code and the live-rendered charts:

- **Section 4** — bar chart recolored (bars are teal, scatter is blue — no pink); all axes labeled ("Hour of day", "Avg engagement score", "Avg lag hours"); scatter bubble size (ZAxis) reduced.
- **Section 7** — Barrier-to-Entry line recolored to blue; Volatility Score built and added as a second line; chart titled "Market Concentration and Volatility"; country diversity table shows up to 15 rows (not limited to 6); field-name mismatches resolved (charts populate correctly).
- **Section 2** — Y-axis zoomed to the data range, overall-average reference line and month-over-month KPI card present.
- **General** — Section 2 & 4 label/tooltip cleanup complete.

### Fixed during revival — 2026-07-01

- **Section 7, Concentration/Volatility chart** — concentration Y-axis formatted as a percentage (`27%`); volatility kept as a raw count (it is *average rank-change*, not a proportion, so a "%" would misrepresent it); both on clean 0-based axes with evenly-spaced ticks.
- **Section 7, Barrier-to-Entry chart** — Y-axis abbreviated (`2,800,000` → `2.8M`), with the precise value shown on hover.

### Still genuinely pending

- **Phase 2 / data-dependent (not cosmetic):** run the YouTube API enrichment at scale → real categories & revenue; correct the engagement-quality multiplier (2 → 5); build the missing insight families (hashtag density, title sentiment, seasonality). All of these are fixed at the root by the Phase 2 pipeline rebuild.
- **Phase 3 (decided 2026-07-08):** the short vs. long form work — Dashboard 2 completion and short-form separation — is deliberately deferred to its own phase, to run after Phase 2's enrichment supplies the video durations it depends on.
- **Optional:** rename the Section 2 heading "Platform Health Trajectory" → "Content Performance Health Score".

