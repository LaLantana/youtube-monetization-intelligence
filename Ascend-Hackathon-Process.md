# Ascend.io Hackathon \- Process

1. ## Deciding on a Project Focus

In the near future, I’d like to build AI agents that post autonomously on social media and need data that the agents can use as decision frameworks for social media posts. For this project I was looking for existing social media datasets on Kaggle, so I was fairly open to focusing on any platform I could find substantial clean data for and somewhat open to different types of data as long as it was specifically related to post engagement.

2. ## The Search for “Clean” Data

I searched Kaggle for potential datasets and found two recent datasets that might fit my purpose:

1\. Instagram Media Metadata & Engagement Metrics  
[https://www.kaggle.com/datasets/prajapatisuraj/instagram-media-metadata-and-engagement-metrics](https://www.kaggle.com/datasets/prajapatisuraj/instagram-media-metadata-and-engagement-metrics)

2\. Trending YouTube Video Statistics (113 Countries)  
[https://www.kaggle.com/datasets/asaniczka/trending-youtube-videos-113-countries](https://www.kaggle.com/datasets/asaniczka/trending-youtube-videos-113-countries)

(Recency was crucial as social media and the digital world change very quickly.)

### Data Hygiene

Before committing to a dataset I checked that the data was clean and unbiased enough to achieve my goals.

#### DATASET 1 \- Instagram Media Metadata & Engagement Metrics (usability 8.8)

Update frequency: Quarterly  
Last update: 4 months ago  
License: Free for public use \- CC0: Public Domain [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)  
Dataset usability: 8.8

Whether the dataset covers multiple accounts/creators or is limited to just a handful like Keke Palmer and Jimmy Fallon. If it's only 2-3 creators, the sample size might limit how generalizable the final insights are. 

**Timing intelligence**

* Which days/hours correlate with highest engagement?  
* Does posting frequency affect per-post performance?

**Format intelligence**

* Do Reels consistently outperform Carousels in likes? Comments?  
* What video dimensions/lengths perform best?

**Content intelligence**

* Caption length vs. engagement correlation  
* Hashtag density vs. reach (good NLP starter project)  
* Do paid partnerships help or hurt organic engagement signals?

**Credibility signals**

* Does verified status amplify engagement independently of follower count?  
* How do co-author collaborations affect performance?

First, I used the Kaggle notebook function to run Python code that Claude helped me write to find the following information:

**299 unique creators** across 1,152 posts \- that's a genuinely diverse dataset, not just a few celebrities. Very usable.

**Good content type mix** \- 716 Reels, 335 Carousels, 101 feed posts. Enough of each to compare performance across formats meaningfully.

**Engagement numbers are juicy** \- average 156K likes per post, ranging from 3 to 2.5M. That's a wide spread which makes for interesting analysis.

user column is storing the entire nested JSON object as a string (that's why you saw all that messy profile URL data) instead of just the username. You'll need to extract the username cleanly.

view\_count is completely empty (all NaN) \- so that metric is a dead end if I use this file.

Code:

\# Basic sanity check   
print("=== CREATORS \===")   
print(df\['user'\].value\_counts()) 

print("\\n=== CONTENT TYPES \===")   
print(df\['product\_type'\].value\_counts()) 

print("\\n=== DATE RANGE \===")   
print(df\['taken\_at'\].min(), df\['taken\_at'\].max()) 

print("\\n=== SUMMARY \===")   
print(f"Total rows: {len(df)}")   
print(f"Total columns: {len(df.columns)}")   
print(f"Unique creators: {df\['user'\].nunique()}") 

print("\\n=== ENGAGEMENT OVERVIEW \===")   
print(df\[\['like\_count', 'comment\_count', 'view\_count'\]\].describe())

Then, I used this code to get the actual date range and who the most represented creators are:

import ast 

\# Extract just the username from the nested user column   
df\['username'\] \= df\['user'\].apply(lambda x: ast.literal\_eval(x).get('username') if isinstance(x, str) else None) 

\# Convert taken\_at from Unix timestamp to readable date   
df\['taken\_at'\] \= pd.to\_datetime(df\['taken\_at'\], unit\='s') 

\# Check date range now   
print("Date range:", df\['taken\_at'\].min(), "to", df\['taken\_at'\].max()) 

\# Top creators by post count   
print("\\nTop 10 creators:")   
print(df\['username'\].value\_counts().head(10))

Running the code returned these results:

Date range: 2023-06-17 23:52:51 \-  2025-12-22 20:10:26

Top 10 creators:

| Username | Count |
| :---- | :---- |
| keke | 903 |
| wonderymedia | 18 |
| oneofthemdaysmovie | 18 |
| fallontonight | 17 |
| kekepalmerpodcast | 10 |
| babyleodis | 10 |
| revolt | 8 |
| primevideo | 8 |
| bet | 7 |
| whowhatwear | 6 |

Conclusion

While the date range was ok (mid 2023 to end 2025), 903 out of 1,152 rows in the dataset are for the same content creator (Keke), that's **78% of the dataset**. This is essentially a Keke Palmer dataset with a few other accounts sprinkled in, which means any "insights" would really just be insights about her account specifically, not about Instagram engagement patterns in general, which is not an ideal as a foundation for an autonomous posting agent.

#### DATASET 2 \- Trending YouTube Video Statistics (113 Countries)

Update frequency: Daily  
License: Free for public use \- Open Data Commons Attribution License (ODC-By) v1.0 [https://opendatacommons.org/licenses/by/1-0/index.html](https://opendatacommons.org/licenses/by/1-0/index.html)  
Dataset usability: 10

What I checked:

* That "daily updates" means there are genuinely multiple days of data, not just a single snapshot  
* That the 113 countries are reasonably evenly represented  
* That engagement columns don't have the same view\_count all-NaN problem the last dataset had  
* That there's a category or content-type column we can use for segmentation

Python Path Fetcher Code:

import pandas as pd 

import os  
   
\# Find the file first   
for dirname, \_, filenames in os.walk('/kaggle/input'):   
	for filename in filenames:   
		print(os.path.join(dirname, filename))

Returned:

/kaggle/input/datasets/asaniczka/trending-youtube-videos-113-countries/trending\_yt\_videos\_113\_countries.csv

Python Code 2:

import pandas as pd

df \= pd.read\_csv('/kaggle/input/datasets/asaniczka/trending-youtube-videos-113-countries/trending\_yt\_videos\_113\_countries.csv')

print("=== SHAPE \===")

print(df.shape)

print("\\n=== COLUMNS \===")

print(df.columns.tolist())

print("\\n=== DATE RANGE \===")

print(df\['snapshot\_date'\].min(), df\['snapshot\_date'\].max())

print("\\n=== ENGAGEMENT OVERVIEW \===")

print(df\[\['view\_count', 'like\_count', 'comment\_count'\]\].describe())

print("\\n=== MISSING VALUES \===")

print(df.isnull().sum().sort\_values(ascending=False).head(15))

print("\\n=== COUNTRY COVERAGE \===")

print(f"Unique countries: {df\['country'\].nunique()}")

print("\\n=== VIDEO CATEGORIES \===")

print(df\['kind'\].value\_counts())

Returned 2:

\=== SHAPE \===

(5019235, 18\)

\=== COLUMNS \===

\['title', 'channel\_name', 'daily\_rank', 'daily\_movement', 'weekly\_movement', 'snapshot\_date', 'country', 'view\_count', 'like\_count', 'comment\_count', 'description', 'thumbnail\_url', 'video\_id', 'channel\_id', 'video\_tags', 'kind', 'publish\_date', 'langauge'\]

\=== DATE RANGE \===

2023-10-26 2026-04-08

\=== ENGAGEMENT OVERVIEW \===

         view\_count    like\_count  comment\_count

count  5.019235e+06  5.019235e+06   5.019235e+06

mean   1.011920e+07  3.143209e+05   7.023866e+03

std    2.386051e+07  7.830203e+05   5.000359e+04

min    0.000000e+00  0.000000e+00   0.000000e+00

25%    2.944570e+05  8.002000e+03   2.750000e+02

50%    1.202816e+06  3.957000e+04   1.053000e+03

75%    7.611241e+06  2.343505e+05   3.585000e+03

max    1.407108e+09  1.576806e+07   6.493188e+06

\=== MISSING VALUES \===

video\_tags         1521417

langauge            965870

description         713299

title                    0

channel\_name             0

daily\_rank               0

country                  0

daily\_movement           0

weekly\_movement          0

snapshot\_date            0

comment\_count            0

like\_count               0

view\_count               0

thumbnail\_url            0

channel\_id               0

dtype: int64

\=== COUNTRY COVERAGE \===

Unique countries: 113

\=== VIDEO CATEGORIES \===

kind

youtube\#video    5019235

Name: count, dtype: int64

**The green flags**

* **5 million rows** — this is genuinely big data, great for a bootcamp pipeline demo  
* **Date range October 2023 to today (April 8 2026\)** — over 2.5 years of daily data, excellent for trend analysis  
* **All 113 countries present** — evenly distributed since 50 videos × 113 countries × daily snapshots adds up perfectly  
* **Zero missing values** on all the important columns — view\_count, like\_count, comment\_count, daily\_rank, snapshot\_date are all complete  
* **No creator concentration problem** — this is trending videos across the whole platform, not one person's account

**The minor flags**

* `video_tags` is missing for \~1.5M rows — not a dealbreaker but limits hashtag analysis  
* `language` (note the typo in the dataset — it's spelled `langauge`) is missing for \~965K rows — worth noting but not critical  
* `kind` is always `youtube#video` — that column is useless, ignore it

**The verdict**

The pipeline story is clean and compelling — ingest 5M rows of daily trending data, transform into engagement benchmarks by country and time period, visualize what makes content trend and stick. 

3. ## Project Planning

### Defined Project Objective

Build a production-ready data pipeline that ingests, enriches, and transforms YouTube trending video data across 113 countries into actionable monetization intelligence, identifying which content categories, formats, topics, and timing patterns consistently produce the highest estimated revenue, and how those patterns evolve over time, to serve as the analytical foundation for a future autonomous YouTube content agent.

The key elements worth noting:

* Monetization is the primary goal, not engagement for its own sake  
* Actionable means the output informs future decisions, not just describes the past  
* Foundation for a future agent gives context for why certain analytical choices were made without requiring Otto to build the agent itself

### Pipeline Considerations

The bootcamp used two APIs (OpenMeteo \+ Carbon Intensity). I wanted to use three data sources with more complex join logic:

* Kaggle API (base dataset)  
* YouTube Data API (enrichment — duration, category, subscriber count)  
* Google Trends API (correlation layer)

This means the initial review step was even more important than in the bootcamp, because the join logic between these three sources is where errors are most likely to hide.

This project also need the following things that the Bootcamp didn’t cover: 

* **API quota management** \- the YouTube Data API has strict daily quotas. Otto must build in quota tracking and graceful degradation if the limit is hit.  
* **Incremental Kaggle ingestion** \- the Bootcamp used 30-day rolling windows, while this project needs a "only fetch new rows since last run" pattern  
* **The `langauge` typo handling** \- this needs to be explicitly called out in our prompt as a known data quality issue to address in the transform layer. 

### 7-Step Pipeline Plan

(Building on the Bootcamp Track 2 workflow.)

##### **Step 1 — The Build Prompt** should specify:

* Kaggle API credentials as environment variables, dataset ID `asaniczka/trending-youtube-videos-113-countries`  
* YouTube Data API endpoint and quota limits  
* Google Trends API endpoint  
* Known data quality issues: `langauge` typo, \~1.5M null `video_tags` rows, empty `view_count` in some records  
* Engagement thresholds we care about (to be defined — we should decide these)  
* The viral fingerprint classification logic (rocket, slow burner, evergreen)  
* Final deliverable: interactive dashboard with the time-series and country-level insights we identified  
* Process: plan first, build iteratively, test each component, incremental ingestion only

##### **Step 2 — Plan Review** should verify:

* Correct Kaggle dataset ID and API auth pattern  
* YouTube API quota handling is included  
* The three-source join logic makes sense  
* `langauge` typo is addressed  
* Incremental ingestion logic is present

##### **Step 3 — Build and Verify** probing questions:

* What assumptions did you make without asking me?  
* How are you handling the YouTube API quota limits?  
* Show me the top 10 videos by country spread — do the results feel realistic?  
* How are null `video_tags` rows being treated in the hashtag analysis?

##### **Step 4 — Inspect Code and Data**

* Verify incremental ingestion isn't accidentally reprocessing old rows  
* Check that publish-to-trending lag handles timezone differences  
* Confirm the viral fingerprint classification thresholds make sense against real examples

##### **Step 5 — Visualizations** (audience: hackathon judges \+ your future autonomous agent)

* Viral fingerprint dashboard  
* Platform Health Index over time  
* Topic trend cycles heatmap  
* Country volatility leaderboard

##### **Step 6 — Production Ready**

* Kaggle API pull parameterized by last run date  
* YouTube API quota counter resets daily  
* All date windows dynamic, never hardcoded

##### **Step 7 — Alerting**

* Failure alert with Otto's root cause analysis (directly from bootcamp Prompt 9\)  
* Success alert when a new topic cluster spikes unexpectedly across 10+ countries simultaneously — this is the signal your autonomous agent would eventually act on

### 

### Defining engagement thresholds

**What the Data Told Us**

Looking back at our engagement overview:

        view\_count      like\_count    comment\_count  
mean     10,119,200         314,321            7,024  
25%         294,457           8,002              275  
50%       1,202,816          39,570            1,053  
75%       7,611,241         234,351            3,585  
max   1,407,108,000      15,768,060        6,493,188

**Proposed Thresholds**

**Engagement Tiers (based on view\_count)**

| Tier | Definition | View Count Range |
| ----- | ----- | ----- |
| Mega Viral | Top 5% | 50M+ views |
| Viral | Top 25% | 7.6M+ views |
| Trending | Middle 50% | 1.2M–7.6M views |
| Emerging | Bottom 25% | Under 1.2M views |

**Viral Fingerprint Classifications (based on daily\_movement)**

| Classification | Definition |
| ----- | ----- |
| Rocket | Jumps 20+ ranks upward within 48 hours |
| Slow Burner | Climbs steadily 1–5 ranks per day over 7+ days |
| Evergreen | Stays within top 25 for 14+ consecutive days |
| Flash | Hits top 10 then drops 20+ ranks within 72 hours |

**Engagement Quality Score (combining all three metrics)**

Rather than looking at raw counts, engagement quality accounts for the ratio between interactions:

| Signal | Formula |
| ----- | ----- |
| Like Rate | like\_count ÷ view\_count |
| Comment Rate | comment\_count ÷ view\_count |
| Engagement Score | (like\_count \+ comment\_count × 10\) ÷ view\_count |

The comment multiplier of 10 reflects that commenting requires significantly more intent than liking — a well established principle in social media analytics.

**Country Spread Score**

| Classification | Definition |
| ----- | ----- |
| Global | Trending in 50+ countries simultaneously |
| Regional | Trending in 10–49 countries |
| Local | Trending in under 10 countries |

**Platform Health Index (monthly)**

| Metric | What it tracks |
| ----- | ----- |
| Volatility Score | Average daily rank change across all videos |
| Concentration Score | % of trending slots held by top 100 channels |
| Diversity Score | Number of unique languages in top 50 per country |
| Barrier to Entry | Median view count needed to reach top 10 |

**Two Things to Decide Before We Lock These In**

First, the comment multiplier — 10 is a reasonable industry standard but we could adjust it. Higher means we reward conversation-driving content more heavily, which might matter if your autonomous agent's goal is community building vs. pure reach.

Second, the Evergreen threshold of 14 days — given that our dataset spans 2.5 years of daily snapshots, we could actually calculate what the real average trending duration is and set this threshold based on observed data rather than assumption. Would you like to add that as a verification step in our build prompt?

**On the Engagement Tiers**

Yes, correct — the tiers are percentile-based, meaning a "Viral" video sits in the top 25% of all videos in the dataset by view count. The actual number (7.6M+) is just what the 75th percentile happens to be in this specific dataset. This is actually a stronger approach than picking arbitrary round numbers because it's grounded in the real distribution of the data.

**On Rocket, Slow Burner, Evergreen, Flash**

Honest answer — these aren't formally standardized industry terms with universal definitions. "Evergreen" is widely used in content marketing to describe long-lasting content. The others are intuitive labels I applied to movement patterns. The more important thing is that the *underlying patterns* they describe are real and measurable using `daily_movement` and `weekly_movement`. We should note in our build prompt that these are our project-defined classifications, not industry standards, so Otto doesn't go looking for external definitions.

**On Engagement Tiers vs. Engagement Quality Score**

Good catch — this is genuinely inconsistent and worth resolving. Here's the distinction I'd propose making explicit:

* **Engagement Tiers** \= raw size of audience reached (how many people saw it)  
* **Engagement Quality Score** \= how deeply that audience interacted (what proportion of viewers acted)

Both matter but they measure different things. For your autonomous agent's monetization goal specifically, you actually want *both* — a video needs sufficient raw reach to generate ad revenue, but engagement rate determines CPM attractiveness to advertisers. A video with 10M views but a 0.1% like rate tells a very different monetization story than one with 1M views and a 5% like rate.

So rather than choosing one framework, I'd suggest keeping both and using them together as a two-axis classification:

|  | High Engagement Quality | Low Engagement Quality |
| ----- | ----- | ----- |
| **High Reach** | 🏆 Premium | 📺 Passive |
| **Low Reach** | 💎 Niche Gem | ❌ Skip |

The "Niche Gem" quadrant is particularly interesting for your agent — high engagement rate but lower raw views often signals an underserved audience with monetization potential.

**On Diversity Score Value**

This one is worth expanding on because it's more strategically valuable than it first appears. The Diversity Score tracks how many unique languages appear in each country's top 50 trending videos each month. Here's why that matters specifically for your autonomous agent:

A low diversity score in a country means its trending list is dominated by content in one language — typically local content. This signals a *closed market* that's hard to penetrate with foreign-language content. A high and rising diversity score means the algorithm is increasingly surfacing international content to that audience — an *opening market* where a well-performing video in one country has a realistic chance of crossing over.

For your agent specifically, tracking diversity score over time could tell it which markets are becoming more algorithmically receptive to content that's already performing elsewhere, essentially identifying the best expansion targets for a video that's already gaining traction.

**On Monetization vs. Community Building**

For pure monetization, reach is the right priority — ad revenue scales with views, not comments. However I'd suggest a slight nuance: comment rate still matters as a *signal to the algorithm* rather than a direct revenue driver. YouTube's algorithm treats high comment engagement as a quality signal that amplifies distribution, which in turn drives more views and more ad revenue. So rather than deprioritizing comments entirely, I'd reframe the multiplier purpose — it's not about valuing community for its own sake, it's about capturing the algorithmic amplification effect that comments trigger. A multiplier of 5 rather than 10 might better reflect that secondary role for a monetization-focused agent.

**On Data Freshness and Short vs. Long Form**

This is one of the most important questions you've raised and it has real implications for how we filter the dataset. Let's tackle both parts:

**Data from 2023/2024** — your instinct is right to be cautious. The YouTube algorithm has changed significantly, particularly with the rise of Shorts. However, the time-series dimension actually helps here rather than hurts — rather than treating all 2.5 years equally, we can weight recent data more heavily and use older data specifically for long-term trend pattern recognition. The 2023 data isn't useless; it's just most valuable for answering "what patterns have stayed consistent over time" rather than "what's working right now."

**Short vs. Long Form** — the dataset's `kind` column unfortunately only contains `youtube#video` for everything, which means we can't directly distinguish Shorts from regular videos from that column alone. However we can infer it two ways:

* Via the YouTube Data API enrichment we planned — video duration is available and anything under 60 seconds is a Short  
* Via `video_tags` — Shorts are often tagged with `#shorts` or `#ytshorts`

Your logic on revenue is exactly right. YouTube pays roughly:

| Format | Typical RPM |
| ----- | ----- |
| Long form (8+ min) | $3–$10 |
| Long form with mid-rolls (10+ min) | $5–$15 |
| Shorts | $0.03–$0.07 |

Shorts RPM is approximately 100x lower than long form. For a monetization-focused agent, filtering to long form content isn't just a preference — it's a fundamentally different revenue category.

This suggests we should add a **content length filter** as a core business constraint in our build prompt, specifically requesting the YouTube API enrichment for duration data early in the pipeline so we can filter before doing any downstream analysis.

**On Missing Thresholds — Niche vs. RPM**

Great addition. Here's what I'd suggest adding:

**Niche Classification** — based on category data we'll pull from the YouTube API:

| Classification | Definition | Why it matters |
| ----- | ----- | ----- |
| Mass Market | Entertainment, Music, Sports | High volume, lower RPM |
| Mid-Tier | Gaming, Comedy, Lifestyle | Balanced reach and RPM |
| High-Value Niche | Finance, Tech, Business, Health | Lower volume, higher RPM |

**RPM Estimates by Category** — we can't measure RPM directly from the dataset, but we can build a lookup table based on published industry benchmarks and attach it as a business constant in our prompt:

| Category | Estimated RPM Range |
| ----- | ----- |
| Finance/Investing | $12–$45 |
| Technology | $8–$20 |
| Health & Fitness | $7–$15 |
| Gaming | $3–$8 |
| Entertainment | $2–$5 |
| Music | $1–$4 |

This means a Finance video with 500K views could generate more revenue than an Entertainment video with 5M views. For your autonomous agent, optimizing for *RPM-weighted reach* rather than raw views would be a genuinely sophisticated monetization strategy.

**On Setting Thresholds from Observed Data**

Fully agree — the Evergreen threshold especially should be data-derived. I'd suggest adding this as an explicit step in our verification questions to Otto after the build:

What is the actual distribution of trending durations across all videos in the dataset? What is the median, 75th percentile, and 90th percentile number of consecutive days a video stays in the trending list? Use these observed values to set the Evergreen, Slow Burner, and Flash classification thresholds rather than the assumed values in the plan.

This way our classifications reflect what YouTube's algorithm actually does rather than what we assumed it does — which is precisely the anti-hallucination principle from the bootcamp applied to business logic rather than code.

**Suggested Additions to Our Business Constants**

Before we write the build prompt, here's the updated list of constants and filters we should hardcode:

| Constant | Value | Source |
| ----- | ----- | ----- |
| Comment multiplier | 5 | Our definition |
| Minimum video duration | 180 seconds | Filter out Shorts |
| RPM lookup table | By category | Industry benchmarks |
| Data recency weight | 2025–2026 prioritized | Our decision |
| Evergreen threshold | To be derived from data | Observed distribution |
| Viral country spread | 50+ countries \= Global | Our definition |
| High value niche categories | Finance, Tech, Health, Business | Our definition |

4. ## Creating the Build Prompt

### 1\. Dataset & Data Sources

| Source | Details |
| ----- | ----- |
| **Primary Dataset** | Kaggle: `asaniczka/trending-youtube-videos-113-countries` |
| **Access Method** | Kaggle API (incremental ingestion — new rows only per run) |
| **Enrichment Layer 1** | YouTube Data API (duration, category, subscriber count) |
| **Enrichment Layer 2** | Google Trends API (topic correlation) |
| **Dataset Size** | 5,019,235 rows, 18 columns |
| **Date Range** | October 2023 – present (daily updates) |
| **Country Coverage** | 113 countries |

### 2\. Known Data Quality Issues to Address in Pipeline

| Issue | Action |
| ----- | ----- |
| `langauge` column typo | Handle explicitly in transform layer |
| \~1.5M null `video_tags` rows | Exclude from hashtag analysis, retain for all other analysis |
| \~965K null `langauge` rows | Flag but retain rows for non-language analysis |
| `kind` column | Discard — contains only one value |
| `view_count` zeros | Flag for investigation — may be Shorts or private data |
| Short form content | Separate from long form — do not mix in main analysis |

### 3\. Content Filter — Long Form vs. Short Form

| Format | Definition | Treatment |
| ----- | ----- | ----- |
| **Short Form** | Under 180 seconds | Separate comparative visualization only |
| **Long Form** | 180 seconds and above | Primary analysis |
| **Mid-Roll Eligible** | 480 seconds (8 min)+ | Flag for duration multiplier |
| **Mid-Roll Maximized** | 600 seconds (10 min)+ | Higher duration multiplier |

*Duration data to be pulled from YouTube Data API as early pipeline step — filter applied before all downstream analysis.*

### 4\. Engagement Tiers (Percentile-Based on view\_count)

| Tier | Threshold | Percentile |
| ----- | ----- | ----- |
| Mega Viral | 50M+ views | Top 5% |
| Viral | 7.6M+ views | Top 25% |
| Trending | 1.2M–7.6M views | Middle 50% |
| Emerging | Under 1.2M views | Bottom 25% |

### 5\. Engagement Quality Score

**Formula:**

Engagement Score \= (like\_count \+ comment\_count × 5\) ÷ view\_count

**Two-Axis Classification (Reach × Engagement Quality):**

|  | High Engagement Quality | Low Engagement Quality |
| ----- | ----- | ----- |
| **High Reach** | Premium | Passive |
| **Low Reach** | Niche Gem | Skip |

### 6\. Viral Fingerprint Classifications

*Project-defined classifications — not industry-standard terms. All four thresholds to be derived from observed data distributions rather than assumed values.*

| Classification | Provisional Definition | Signal |
| ----- | ----- | ----- |
| Rocket | Jumps 20+ ranks upward within 48 hours | `daily_movement` |
| Slow Burner | Climbs 1–5 ranks per day over 7+ days | `weekly_movement` |
| Evergreen | Stays within top 25 for 14+ consecutive days | Tenure in dataset |
| Flash | Hits top 10 then drops 20+ ranks within 72 hours | `daily_movement` \+ `weekly_movement` |

*Otto to verify all four thresholds against actual observed distributions and adjust accordingly before applying classifications.*

### 7\. Country Spread Classification

| Classification | Definition |
| ----- | ----- |
| Global | Trending in 50+ countries simultaneously |
| Regional | Trending in 10–49 countries |
| Local | Trending in under 10 countries |

### 8\. Niche Classification & RPM Lookup Table

| Category | Classification | Estimated RPM Range |
| ----- | ----- | ----- |
| Finance / Investing | High-Value Niche | $12–$45 |
| Technology | High-Value Niche | $8–$20 |
| Health & Fitness | High-Value Niche | $7–$15 |
| Gaming | Mid-Tier | $3–$8 |
| Comedy / Lifestyle | Mid-Tier | $2–$6 |
| Entertainment | Mass Market | $2–$5 |
| Music | Mass Market | $1–$4 |
| Shorts | N/A | $0.03–$0.07 |

### 9\. Estimated Revenue Formula

Estimated Revenue \= view\_count × (RPM ÷ 1000\) × duration\_multiplier

| Duration | Duration Multiplier |
| ----- | ----- |
| Shorts (under 180s) | 0.01 |
| Standard (180–479s) | 1.0 |
| Mid-Roll Eligible (480–599s) | 1.3 |
| Mid-Roll Maximized (600s+) | 1.5 |

*RPM values drawn from lookup table above. This transforms analysis from "what performs well" to "what earns well."*

### 10\. Platform Health Index (Monthly)

| Metric | What It Measures |
| ----- | ----- |
| **Volatility Score** | Average daily rank change across all videos |
| **Concentration Score** | % of trending slots held by top 100 channels |
| **Diversity Score** | Unique languages in top 50 per country — tracks market openness to international content and identifies expansion opportunities |
| **Barrier to Entry** | Median view count needed to reach top 10 |

### 11\. Business Constants (Hardcoded in Build Prompt)

| Constant | Value |
| ----- | ----- |
| Comment engagement multiplier | 5 |
| Minimum video duration (long form) | 180 seconds |
| Mid-roll eligibility threshold | 480 seconds |
| Mid-roll maximization threshold | 600 seconds |
| Global spread threshold | 50+ countries |
| Regional spread threshold | 10–49 countries |
| High-value niche categories | Finance, Technology, Health & Fitness |
| Data recency weighting | 2025–2026 prioritized |
| All viral fingerprint thresholds | To be derived from observed data |

### 12\. Negative Constraints & Hallucination Guardrails

*These must appear prominently in the build prompt. They define what Otto must never do.*

**Assumption Constraints**

* Do not make any assumptions without explicitly flagging them for review before proceeding  
* Do not invent or approximate values for any business constant — use only the values provided in this prompt  
* Do not use documentation summaries as a source of truth for API response structures — inspect live API responses from exact endpoint URLs before writing any parser code  
* Do not use assumed thresholds for viral fingerprint classifications — derive all four from observed data distributions and present findings for review before applying

**Data Integrity Constraints**

* Never mock, fabricate, or simulate data at any stage of the pipeline  
* Never reprocess rows already ingested in a previous run — incremental ingestion only  
* Never mix short form and long form content in the same analysis — treat as separate data populations  
* Never discard rows with null `video_tags` from the main dataset — only exclude them from hashtag-specific analysis  
* Never hardcode dates or static time windows — all date parameters must be dynamic

**API Constraints**

* Never hardcode API credentials — store all keys as environment variables  
* Never exceed YouTube Data API daily quota limits — build quota tracking and graceful degradation into the pipeline from the start  
* Never modify existing automation files when adding new ones — always create separately

**Build Process Constraints**

* Do not build downstream components before validating upstream ones — test each component before proceeding to the next  
* Do not run the full pipeline to fix a single component error — only re-run the component being fixed  
* Do not proceed past the plan stage without explicit approval

### 13\. Key Insights the Pipeline Should Surface

**Timing Intelligence**

* Which days and hours correlate with highest engagement for long form content?  
* How quickly do videos typically hit trending after publishing (publish-to-trending lag)?  
* Is lag getting faster or slower over time?

**Content Intelligence**

* Title length and sentiment vs. engagement correlation  
* Hashtag density vs. reach (from `video_tags`)  
* Which topic clusters are rising, peaking, or declining?  
* Seasonal topic trend cycles

**Monetization Intelligence**

* Estimated revenue per video using the formula above  
* Highest RPM-weighted reach by category  
* Which categories consistently produce Premium quadrant videos?  
* Which categories consistently produce Niche Gem quadrant videos?  
* Which markets are opening up to international content (Diversity Score)?

**Viral Fingerprint**

* Distribution of Rocket, Slow Burner, Evergreen, and Flash videos  
* Which categories produce which fingerprint types?  
* Do certain fingerprint types correlate with higher estimated revenue?

**Time-Series Trends**

* Platform Health Index month over month  
* Engagement benchmark evolution over time  
* Country volatility trends across 2.5 years  
* Language diversity trajectory per country

### 14\. Pipeline Architecture (7 Steps — Adapted from Bootcamp)

| Step | Action |
| ----- | ----- |
| **1\. Build Prompt** | Single comprehensive prompt with plan-first instruction and all negative constraints |
| **2\. Plan Review** | Verify data sources, join logic, business constants, quality handling, and constraint enforcement before any code is written |
| **3\. Build & Verify** | Iterative component-by-component build; verify output with probing questions asked interactively one at a time |
| **4\. Inspect** | Three-layer check: output → logic → underlying data |
| **5\. Visualizations** | Stakeholder-ready dashboard for hackathon judges |
| **6\. Production Ready** | Dynamic dates, API credentials as environment variables, incremental ingestion |
| **7\. Alerting** | Failure alert with root cause \+ topic spike alert across 10+ countries |

### 15\. Otto Rules to Create

| Rule Type | Scope | Content |
| ----- | ----- | ----- |
| **Monetization strategy rule** | Keyword-scoped | Engagement formula, RPM table, duration multipliers, two-axis classification |
| **Data quality rule** | Glob-scoped on data files | Handle `langauge` typo, null tags, short form filter |
| **API quota rule** | Keyword-scoped | YouTube API daily quota limits and graceful degradation behavior |
| **Incremental ingestion rule** | Always-on | Never reprocess already-ingested rows |
| **Threshold derivation rule** | Always-on | Derive all four viral fingerprint thresholds from observed data distributions — never use assumed values |

### 16\. Post-Build Verification Checklist

*For your use only during Step 3 — ask interactively one at a time after the build completes. Do not include in the build prompt.*

1. What assumptions did you make without asking me?  
2. How are you handling YouTube API quota limits?  
3. What is the actual observed distribution of trending durations — use this to set Evergreen, Slow Burner, Rocket, and Flash thresholds  
4. Show me the top 10 videos by country spread — do results feel realistic?  
5. How are null `video_tags` rows being treated in hashtag analysis?  
6. Are timezone differences accounted for in publish-to-trending lag calculations?  
7. Are videos appearing in multiple countries being counted correctly in global aggregations?  
8. What is the split between short form and long form content in the dataset?

### Build Prompt

I created a .md file to maintain table formatting in the prompt and ease of use:  
[https://drive.google.com/file/d/1GruMuPD-JIkM\_rceLFP8rDJEe\_iTM2Ea/view?usp=sharing](https://drive.google.com/file/d/1GruMuPD-JIkM_rceLFP8rDJEe_iTM2Ea/view?usp=sharing)

## 5\. API Set Up in Ascend.io Secrets

Before running the build prompt in Otto, I:

1. Created a Kaggle API token and added it to Ascend Secrets.  
2. Set up a Google Cloud project, enabled YouTube Data API v3, created an API key, and added it to Ascend Secrets.  
3. Verified both secrets were saved correctly in Ascend Secrets and checked that the build prompt included the right API information before pasting the build prompt.

Once those two Secrets were in place, Otto had everything it needed to access all three data sources when it built the pipeline. The `pytrends` library was handled automatically during the build.

## 6\. Approval of Otto’s Build Plan

### Otto:

Plan created at youtube\_trending\_intelligence\_pipeline\_plan.md.

Included in the plan:

* phased build sequence from live API inspection through alerting  
* explicit validation gates before downstream work  
* a mandatory approval pause before viral fingerprint classification  
* production-readiness and artifact strategy  
* the requested Otto rule/command deliverables

Flagged decisions needing your review before implementation:

1. Proposed flow name: youtube\_trending\_intelligence  
2. Incremental-state storage pattern for watermarks and quota-deferred retries  
3. Source for YouTube category ID → category name mapping  
4. Topic clustering method for video\_tags \+ title  
5. Title sentiment method  
6. Country/timezone reference strategy for 113 countries  
7. Exact definition of “last successful run date” for incremental Kaggle ingestion  
8. Granularity for persisted YouTube quota tracking  
9. Whether artifacts should be one consolidated dashboard or multiple artifacts  
10. Mechanism for generating Otto root-cause analysis in failure alerts

Verification:

* youtube\_trending\_intelligence\_pipeline\_plan.md saved successfully  
* latest build completed successfully: build:d699189a

I will not write any pipeline code until you explicitly approve the plan.

### 

### My response:

Plan approved.  
Decisions:

1. Approved — use youtube\_trending\_intelligence as the flow name.  
2. Store incremental state in two persistent tables — pipeline\_state for the Kaggle watermark (last successful snapshot\_date) and youtube\_quota\_retry\_queue for video IDs that failed YouTube API enrichment due to quota limits. Both tables should be created on first run if they don't exist.  
3. Use a hardcoded lookup dictionary for YouTube category ID to category name mapping, covering the standard global category set. Flag any category IDs encountered in the data that are not in the lookup dictionary rather than silently dropping them.  
4. Use TF-IDF vectorization combined with K-Means clustering for topic cluster derivation from video\_tags and title. Start with 25 clusters and flag the cluster quality metrics (inertia and silhouette score) for review before proceeding to downstream analysis. Apply only to English-language content in the first pass, then extend to other languages if time permits.  
5. Use VADER (Valence Aware Dictionary and sEntiment Reasoner) for title sentiment analysis. Classify each title as positive, negative, or neutral based on the compound score (positive ≥ 0.05, negative ≤ \-0.05, neutral in between). VADER is available via the vaderSentiment Python package.  
6. Use the pytz library for timezone handling. Build a hardcoded country-to-primary-timezone mapping for the 113 countries in the dataset. Where a country spans multiple timezones (e.g. USA, Russia), use the country's most populous timezone as the representative. Default to UTC for any country not in the mapping and log a warning.  
7. Define "last successful run date" as the maximum snapshot\_date value present in the already-ingested data at the time the pipeline starts. On each run, pull only rows where snapshot\_date is strictly greater than this maximum. On the very first run where no data exists yet, pull all available rows.  
8. Track YouTube API quota consumption at daily granularity, resetting at midnight Pacific Time (US/Pacific timezone). Store the current day's consumed units and the reset date in the pipeline\_state table. Reserve a 500-unit buffer — stop enrichment when consumed units reach 9,500 to avoid accidental overruns. Each videos API call retrieving up to 50 video IDs costs 1 quota unit — batch requests accordingly.  
9. Produce two dashboard artifacts. Dashboard 1 is the primary consolidated Monetization Intelligence Dashboard with internal tabbed navigation covering five sections: Timing Intelligence, Content Intelligence, Monetization Intelligence, Viral Fingerprint, and Time-Series Trends. Dashboard 2 is a separate Short Form vs. Long Form Comparative Panel applying the short form revenue formula (RPM $0.05, duration multiplier 0.01) to short form content only. Both should be saved as separate artifacts.  
10. For the failure alert automation, pass the failed component name, full error message, and stack trace as context to Otto's automated analysis. Otto should produce a plain-language root cause diagnosis and a specific proposed fix. Both should be included in the alert email body — not as attachments.

## 7\. Otto’s Pipeline Build

### Resolved Issues

#### Helping Otto bind the APIs stored in secrets

I used Ascend Plan AI to help create prompts for Otto to find and fix the issue with API binding.

#### Architectural crossroads

#### Data Ingestion Issue

My file is 6.82 GB. What I've tried and why each approach failed:

**1\. Kaggle API via Python read component**

* Authenticated successfully using KAGGLE\_API\_TOKEN stored in Ascend Secrets via context.vaults.get("environment")  
* Kaggle CLI inside the component failed due to the new bearer token format (KGAT\_ prefix) not being supported by the CLI  
* Switched to direct HTTP bearer token authentication — this worked for auth  
* Component was OOM-killed (exit code 137\) repeatedly despite:

Reducing chunk size to 2,000 rows

Applying column selection at read time (16 columns only)

Using gc.collect() after each chunk

Streaming ZIP via BytesIO without writing to disk

Using zipfile.Path to avoid full decompression

**2\. Two-step split (download \+ process as separate components)**

* Split into download\_kaggle\_trending\_archive and read\_kaggle\_trending\_videos  
* Download component succeeded  
* context.tmp\_dir is component-scoped — the downloaded ZIP was not accessible to the downstream processing component  
* Cross-component file sharing via context.tmp\_dir is not supported

**3\. Native Ascend connector**

* Confirmed via Plan AI: no native Kaggle connector exists in this workspace  
* No context.write\_file() / context.read\_file() API available for cross-component file exchange

**4\. OneLake / Microsoft Fabric staging**

* data\_plane\_fabric.yaml connection exists in the workspace  
* Plan AI confirmed the staging path would be abfss://\<container\>@\<account\>.[dfs.core.windows.net/staging/youtube\_trending\_intelligence/](http://dfs.core.windows.net/staging/youtube_trending_intelligence/)  
* However, Plan AI could not confirm that data\_plane\_fabric credentials are automatically available to Python components  
* Implementing this would require explicit credential exposure — not pursued due to time constraints

**5\. Local file upload via read\_local\_files connection**

* \#connection:read\_local\_files points at the project's data/ directory  
* Ascend UI drag-and-drop has a 2MB file size limit  
* 6.82GB file cannot be uploaded this way  
* Plan AI confirmed putting a 6.82GB file in data/ is not recommended as it is source-controlled storage

**6\. GCS upload via read\_gcs\_lake connection**

* \#connection:read\_gcs\_lake points at gs://ascend-ottos-expeditions/  
* Plan AI recommended uploading to gs://ascend-ottos-expeditions/lakev0/uploads/  
* Installed Google Cloud SDK locally and authenticated as design@mayaospina.com  
* Write access test failed with 403 AccessDeniedException — design@mayaospina.com does not have storage.objects.create permission on that bucket

Motherduck upload of 6.82 GB CSV:

Close enough — 5,013,692 vs the expected 5,019,235 is a difference of only 5,543 rows, which is less than 0.1% of the dataset. This is almost certainly due to a few malformed rows that `read_csv_auto` skipped during loading. That's completely acceptable for our purposes and won't meaningfully affect any of the analysis.

All 18 columns are present and the data types look correct. A few things worth noting:

* `langauge` typo is present as expected ✅ — Otto will handle this in the transform layer  
* `snapshot_date` loaded as `date` ✅  
* `publish_date` loaded as `timestamp with time zone` ✅ — this is actually better than plain date as it preserves timezone information which we need for the publish-to-trending lag calculation  
* `daily_rank`, `view_count`, `like_count`, `comment_count` all loaded as `bigint` ✅

`bigint` stands for "big integer" — it's a data type that stores whole numbers (no decimals) up to very large values (up to about 9.2 quintillion).

In plain terms it means:

* `daily_rank` — stored as a whole number, e.g. `1`, `25`, `50` ✅  
* `view_count` — stored as a whole number, e.g. `1,202,816` ✅  
* `like_count` — stored as a whole number, e.g. `39,570` ✅  
* `comment_count` — stored as a whole number, e.g. `1,053` ✅

MotherDuck also solves our **daily refresh problem** elegantly. When the Kaggle dataset updates, instead of dealing with API authentication and ZIP file memory issues, you can simply run a DuckDB CLI command locally to update the MotherDuck table:

sql

INSERT INTO "YouTube Trending Videos".trending\_videos

SELECT \* FROM read\_csv\_auto('/Users/mayaospina/Downloads/new\_data.csv')

WHERE snapshot\_date \> (SELECT MAX(snapshot\_date) FROM "YouTube Trending Videos".trending\_videos);

This inserts only new rows, keeping the table current without reprocessing everything. It's not fully automated yet, but it's a simple manual refresh step that takes seconds rather than the complex Kaggle API ingestion we were trying to build.

You could honestly present this in your hackathon as a deliberate architectural choice — MotherDuck as the ingestion layer with DuckDB's native CSV reading capability, rather than a Python-based API pipeline. It's actually a more elegant solution than what we originally planned.

#### Adjusted Data-driven Thresholds After First Analysis 

**New Proposed Data-Driven Thresholds**

| Classification | Provisional Definition | Proposed Data-Driven Definition | Rationale |
| ----- | ----- | ----- | ----- |
| Rocket | Jumps 20+ ranks in 48 hours | `daily_movement` ≥ 33 on any single day (top 10% of daily climbers) | Genuinely exceptional single-day movement — well above the 75th percentile of \+12 |
| Slow Burner | Climbs 1–5 ranks per day over 7+ days | `weekly_movement` ≥ 35 AND tenure ≥ 5 days (top 25% of both weekly movement and tenure) | Sustained climbing over time — combines weekly momentum with survival signal |
| Evergreen | Stays in top 25 for 14+ consecutive days | Tenure ≥ 9 days (top 10% of all trending videos) | Provisional 14-day threshold was too aggressive — only 10% of videos reach 9 days, making 9 days a genuinely elite signal |
| Flash | Hits top 10 then drops 20+ ranks in 72 hours | `daily_movement` ≥ 33 on entry day AND drops to `daily_movement` ≤ \-20 within 3 days | Mirrors Rocket entry speed but with rapid reversal — captures the burn-bright-burn-out pattern |

## 8\. Pre-Production Build Assessment:

**Dashboard 1 — My additions to your analysis**

**1\. Engagement quality score (0.0451) Your instinct is right to check this. 0.0451 is actually plausible mathematically given our formula `(like_count + comment_count × 5) ÷ view_count` — likes and comments are small relative to view counts on large channels. But it needs context — without a benchmark it means nothing to a judge.**

**2\. All uncategorized in monetization table This is the YouTube API enrichment gap we flagged earlier — the single-record enrichment means almost no videos got a real category assigned. Everything defaulted to "Uncategorized" with RPM $3.50. This is the most significant data quality issue affecting both dashboards and it cascades into the revenue figures too. The $44,538 average monthly revenue and $12,576 latest long-form revenue are almost certainly understated because they're all using the default RPM instead of category-specific RPMs.**

**3\. Platform health trend line Agreed — 31 monthly data points compressed into a small chart reads as flat. The actual range of 30-37 is genuinely narrow which makes it worse. This needs either a zoomed Y-axis or a different visualization type.**

**4\. Missing category labels on bar chart Classic rendering issue — the bars are too narrow for labels. Needs either a horizontal layout or a table alternative.**

**5\. Size and complexity 100% agree — this is the fundamental dashboard design problem. Too much data crammed into too little space with no clear narrative hierarchy.**

---

**Dashboard 2 — My additions**

**1\. Short-form revenue \= $0 and Lag delta \= 0.0 These zeros confirm a data pipeline issue — the short form separation transform likely isn't producing output that's feeding through to the comparative panel correctly. The `separate_content_length_tracks` component may not be routing short form videos to a separate dataset that the dashboard can query.**

**2\. Single line in revenue trend Confirms the same issue — only long form data is reaching the dashboard. Short form data is either empty or not being queried correctly.**

**3\. Premium share declining trend Actually this is interesting data — Premium share dropping from \~20% in early 2024 to \~8% by 2026 could be a genuine signal that the bar for trending content is rising. But it's presented without context so it looks like a problem rather than an insight.**

**4\. Latest month comparison — one format only Same root cause as the $0 short form revenue — no short form data reaching the dashboard.**

---

**The root causes in priority order**

**Root cause 1 — YouTube API enrichment (most impactful) Almost everything flows from this. No real category data means all revenue estimates use the $3.50 default RPM, making the monetization intelligence essentially meaningless. This is the YouTube quota issue we deferred.**

**Root cause 2 — Short form data not flowing to Dashboard 2 The `separate_content_length_tracks` component exists but its short form output isn't reaching the comparative panel materialized views. This is likely a query issue in `dashboard2_panel_metrics.sql` rather than a pipeline problem.**

**Root cause 3 — Dashboard design and sizing Even with perfect data, the current layout would struggle to tell a clear story. Charts are too small, labels are missing, and there's no narrative hierarchy guiding the viewer's eye.**

**Dashboard 1 — Monetization Intelligence Dashboard**

Specified sections:

* ✅ Monetization KPIs — present (average platform health, average monthly revenue, engagement quality, tracked videos)  
* ✅ Long-form platform health trend — present  
* ✅ Top monetization categories — present  
* ✅ Viral fingerprint revenue profile — present  
* ❌ Timing Intelligence section — missing (day/hour engagement patterns, publish-to-trending lag)  
* ❌ Content Intelligence section — missing (title sentiment, hashtag density, topic clusters)  
* ❌ Time-Series Trends section — missing (engagement benchmark evolution, country volatility, language diversity)  
* ❌ Internal tabbed navigation — missing (we specified tabs or sidebar to organise the six sections)

**Dashboard 2 — Short Form vs Long Form Comparative Panel**

Specified content:

* ✅ Revenue comparison — present (partially — short form data missing)  
* ✅ Premium share trend — present  
* ✅ Latest month comparison table — present  
* ❌ Trending duration comparison — missing  
* ❌ Country spread comparison — missing  
* ❌ Engagement rate comparison — missing

---

**The honest assessment**

Both dashboards are significantly incomplete relative to what we specified. Dashboard 1 is essentially showing only the Monetization Intelligence section of what should have been a six-section tabbed dashboard. Four entire insight families are missing from the UI entirely even though the underlying data components are validated.

**The question is: given your time, what's the right response?**

Option A — Tell Otto to add the missing sections with tabbed navigation. This gets you closer to the full spec but risks introducing new bugs with limited time to fix them.

Option B — Accept the current dashboards as a focused MVP and present the missing sections as a clear roadmap with the validated data components already built to support them. This is actually a strong hackathon story — "here's what's built and working, here's exactly what comes next and why."

Given the dashboard issues we've already seen and your time constraint, I'd lean toward Option B — but with one targeted addition. The tabbed navigation structure was a core design decision that would significantly improve the presentation even with the current data. It would organise what's there more clearly and create natural placeholder sections that show judges the full scope of what's planned.

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

**One note:** The estimated revenue formula for short form (RPM $0.05, duration multiplier 0.01) is referenced in the v2 summary as applying only in this comparative panel. Since short form data is largely unavailable due to the enrichment gap, this formula won't produce meaningful output right now — but it is correctly implemented in the pipeline for when enrichment completes. No action needed in the prompt for this.

Lessons Learned

an important lesson for anyone doing this kind of project. Data ingestion is almost always where the unexpected complexity lives, especially when you're dealing with:

* Large file sizes hitting memory constraints  
* Authentication systems that have recently changed (like Kaggle's new bearer token format)  
* Platform-specific limitations that aren't documented until you hit them  
* Cross-component file sharing restrictions

The bootcamp was designed around APIs that Ascend controls (`open-meteo.ascend.dev` and `uk-carbon-intensity.ascend.dev`) — so the ingestion just worked cleanly. Real-world data sources are a completely different challenge.

**What we'd add to a "pre-hackathon checklist" based on this experience:**

Before committing to a dataset, verify:

1. How large is the file? Anything over \~100MB warrants an ingestion strategy conversation  
2. Is the data behind authentication? If yes, has the auth mechanism changed recently?  
3. Does the platform support native ingestion for this source type?  
4. What's the target data store and does it have memory constraints?  
5. Is there a cloud database option (like MotherDuck) that bypasses file handling entirely?

Had we asked those five questions upfront, we'd have gone straight to MotherDuck from the start and saved hours of troubleshooting.

### 

### 

### 

**On Short vs. Long Form**

I'd recommend a middle path — **filter short form out of the main analysis but create a separate comparative visualization** rather than ignoring it entirely. Here's the reasoning:

Excluding it completely loses potentially useful signal. Keeping it mixed in pollutes your long-form insights with incompatible revenue dynamics. But having a side-by-side comparison delivers something genuinely valuable — it lets your agent understand *how differently* the two formats behave algorithmically, which is useful context even if it ultimately focuses on long form. The comparative visualization could show:

* Trending duration: long form vs. short form  
* Country spread: does short form cross borders more easily?  
* Engagement rate patterns: which drives higher comment rates?

That last question is particularly interesting — if short form drives higher comment rates despite lower RPM, it might have value as a *top of funnel* awareness tool that drives subscribers who then watch long form content. That's a nuanced monetization insight your agent could eventually act on.

---

**On Ads Data from YouTube API**

Partially yes, but with significant limitations worth understanding upfront. The YouTube Data API does expose some ad-related signals but not direct ad count or revenue data. Specifically:

| Data Point | Available via API | Notes |
| ----- | ----- | ----- |
| `contentDetails.monetizationDetails` | ❌ Not public | Requires channel ownership |
| Video length (enables mid-rolls) | ✅ Yes | 8+ min enables mid-rolls, 10+ min maximizes them |
| Channel monetization status | ❌ Not public | Private data |
| `statistics.favoriteCount` | ⚠️ Deprecated | No longer populated |
| Category (proxy for RPM) | ✅ Yes | Best available public signal |

So the most useful monetization proxy we can build from public data is: **video duration × category RPM estimate × view count** — which actually gives us a reasonable *estimated revenue* figure per video without needing direct ad data.

The formula would be:

Estimated Revenue \= view\_count × (RPM ÷ 1000\) × duration\_multiplier

Where duration\_multiplier is 1.0 for 8–10 min, 1.3 for 10+ min (mid-roll eligible), and 0.01 for Shorts.

This is worth including as a derived metric in our pipeline — it transforms the analysis from "what performs well" to "what earns well", which is a much more direct answer to your monetization goal.

---

**On the Missing Rocket Category**

Good catch — I dropped it accidentally from the verification prompt. The corrected version should read:

What is the actual distribution of trending durations and movement velocities across all videos in the dataset? Use observed values to set thresholds for all four classifications — Rocket (rapid rank climb), Slow Burner (gradual sustained climb), Evergreen (long-duration stability), and Flash (fast rise, fast fall) — rather than the assumed values in the plan.