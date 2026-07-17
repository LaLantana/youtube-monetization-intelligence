# Monetization Strategy

Use this rule when summarizing or extending #flow:youtube_trending_intelligence.

## Priorities

- Prioritize long-form monetization analysis over mixed-format reporting
- Treat `premium`, `niche_gem`, `passive`, and `skip` as the canonical monetization quadrants
- Use recency-weighted metrics when comparing historical versus current monetization conditions
- Prefer approved summary outputs over ad hoc reinterpretation of raw intermediate datasets

## Preferred Outputs

Use these validated outputs first:

- #component:monetization_intelligence_summary
- #component:monthly_platform_health_index
- #component:time_series_trend_intelligence_summary
- #component:short_long_form_comparative_panel

## Interpretation Guidance

- Emphasize current monetization conditions first, then compare them against prior months
- Call out category leaders using recency-weighted revenue before raw revenue ties
- Highlight when monetization shifts coincide with stronger platform health or viral fingerprint concentration

## Validated Revenue Behavior

- `#component:estimate_video_revenue` applies category-specific RPM values when `youtube_category_name` is populated and otherwise falls back to a default RPM
- The current validated default RPM is `3.0`
- In the current validated workspace build, RPM assignment in the monetization pipeline is dominated by fallback behavior:
  - total rows: `5,013,692`
  - fallback rows: `5,012,515`
  - category-specific rows: `1,177`
  - fallback share: `99.9765%`
- When enrichment coverage is low, treat category rankings, premium/niche-gem interpretations, and viral-fingerprint revenue comparisons as structurally valid but enrichment-limited

## Diagnostic Guidance

- If monetization outputs drop after enrichment changes, first test whether category coverage collapsed and forced more rows onto default RPM
- Prefer checking `uncategorized_rpm_fallback_flag` distribution before investigating downstream summary components