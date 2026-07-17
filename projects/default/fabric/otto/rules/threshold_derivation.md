# Threshold Derivation

Use this rule when working with distribution-derived classifications in #flow:youtube_trending_intelligence.

## Approval Gate

- Never apply provisional viral fingerprint thresholds after summary derivation
- Pause for explicit review when thresholds are requested for human approval
- Use only approved threshold values in downstream classification

## Approved Viral Fingerprint Thresholds

- Rocket: `daily_movement >= 33`
- Slow Burner: `weekly_movement >= 35` and trending tenure `>= 5`
- Evergreen: trending tenure `>= 9`
- Flash: entry-day `daily_movement >= 33` and `daily_movement <= -20` within the following 3 days

## Preferred Components

- #component:derive_trend_movement_features
- #component:summarize_threshold_derivation
- #component:classify_viral_fingerprint